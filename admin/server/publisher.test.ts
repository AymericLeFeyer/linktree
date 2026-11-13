import { describe, expect, it, vi } from "vitest";
import { Publisher } from "./publisher.ts";
import type { WorkflowRun } from "./github.ts";

const run = (status: string, conclusion: string | null): WorkflowRun => ({
  id: 1,
  status,
  conclusion,
  url: "https://github.com/run/1",
});

function make(runs: (WorkflowRun | null)[], deploy?: () => Promise<void>) {
  const queue = [...runs];
  const lookup = async () => (queue.length > 1 ? queue.shift()! : queue[0]);
  const publisher = new Publisher({ deploy, sleep: async () => undefined });
  return {
    track: (commit: string) => publisher.track(commit, lookup),
    get state() {
      return publisher.state;
    },
  };
}

describe("Publisher", () => {
  it("attend la pipeline puis redéploie", async () => {
    const deploy = vi.fn(async () => undefined);
    const publisher = make(
      [null, run("in_progress", null), run("completed", "success")],
      deploy,
    );
    await publisher.track("abc1234");
    expect(deploy).toHaveBeenCalledOnce();
    expect(publisher.state).toMatchObject({ step: "done", commit: "abc1234" });
  });

  it("ne redéploie pas sur une pipeline en échec", async () => {
    const deploy = vi.fn(async () => undefined);
    const publisher = make([run("completed", "failure")], deploy);
    await publisher.track("abc");
    expect(deploy).not.toHaveBeenCalled();
    expect(publisher.state).toMatchObject({
      step: "error",
      runUrl: "https://github.com/run/1",
    });
  });

  it("remonte l'échec de Dockhand", async () => {
    const publisher = make([run("completed", "success")], async () => {
      throw new Error("Dockhand HS");
    });
    await publisher.track("abc");
    expect(publisher.state).toMatchObject({
      step: "error",
      message: "Dockhand HS",
    });
  });

  it("s'arrête à l'image publiée sans Dockhand", async () => {
    const publisher = make([run("completed", "success")]);
    await publisher.track("abc");
    expect(publisher.state?.step).toBe("done");
    expect(publisher.state?.message).toContain("non configuré");
  });

  it("un nouveau commit remplace le suivi précédent", async () => {
    const lookup = async (commit: string) =>
      commit === "second" ? run("completed", "success") : null;
    const publisher = new Publisher({
      sleep: async () => undefined,
      now: (() => {
        let t = 0;
        return () => (t += 1);
      })(),
      timeoutMs: 50,
    });
    const first = publisher.track("first", lookup);
    await publisher.track("second", lookup);
    await first;
    expect(publisher.state).toMatchObject({ commit: "second", step: "done" });
  });

  it("abandonne après le délai", async () => {
    let t = 0;
    const publisher = new Publisher({
      sleep: async () => undefined,
      now: () => (t += 1000),
      timeoutMs: 5000,
    });
    await publisher.track("abc", async () => null);
    expect(publisher.state?.step).toBe("error");
  });
});
