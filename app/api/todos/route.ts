import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const todos = await prisma.todo.findMany({
      include: {
        parents: { include: { parent: true } }, // dependencies (parents)
        children: { include: { child: true } }, // dependents (children)
      },
    });

    // Build maps
    const byId = new Map<number, any>();
    todos.forEach((t) => byId.set(t.id, t));

    // Precompute finishDate
    const finishDate = (t: any) => new Date(t.dueDate || t.createdAt);

    // 1. Topological order (Kahn)
    const indegree = new Map<number, number>();
    todos.forEach((t) => indegree.set(t.id, 0));
    todos.forEach((t) => {
      t.parents.forEach((p: any) => {
        indegree.set(t.id, indegree.get(t.id)! + 1);
      });
    });

    const queue: number[] = [];
    indegree.forEach((deg, id) => {
      if (deg === 0) queue.push(id);
    });
    const topo: number[] = [];

    while (queue.length) {
      const id = queue.shift()!;
      topo.push(id);
      const node = byId.get(id);
      node.children.forEach((c: any) => {
        const childId = c.childId;
        indegree.set(childId, indegree.get(childId)! - 1);
        if (indegree.get(childId) === 0) queue.push(childId);
      });
    }

    // 2. Earliest Start Dates
    const earliestStart: Record<number, Date> = {};
    topo.forEach((id) => {
      const task = byId.get(id);
      if (task.parents.length === 0) {
        earliestStart[id] = new Date(task.createdAt);
      } else {
        const maxParentFinish = task.parents
          .map((d: any) => finishDate(d.parent).getTime())
          .reduce((a: number, b: number) => Math.max(a, b), 0);
        const nextDay = new Date(maxParentFinish);
        nextDay.setDate(nextDay.getDate() + 1);
        earliestStart[id] = nextDay;
      }
    });

    // 3. Critical Path via Longest Path DP in DAG
    const dp: Record<number, number> = {};
    const prev: Record<number, number | null> = {};

    topo.forEach((id) => {
      const task = byId.get(id);
      const es = earliestStart[id];
      const fd = finishDate(task);
      const duration = Math.max(0, fd.getTime() - es.getTime()); // ms
      if (task.parents.length === 0) {
        dp[id] = duration;
        prev[id] = null;
      } else {
        // pick parent yielding max dp
        let bestParent = null;
        let bestValue = -1;
        task.parents.forEach((p: any) => {
          const pid = p.parentId;
          if (dp[pid] > bestValue) {
            bestValue = dp[pid];
            bestParent = pid;
          }
        });
        dp[id] = bestValue + duration;
        prev[id] = bestParent;
      }
    });

    // Reconstruct path ending at node with max dp
    let endId = topo[0];
    topo.forEach((id) => {
      if (dp[id] > dp[endId]) endId = id;
    });

    const criticalPath: number[] = [];
    let cur: number | null = endId;
    while (cur != null) {
      criticalPath.unshift(cur);
      cur = prev[cur];
    }

    // Enrich todos with computed fields
    const enriched = todos.map((t) => ({
      ...t,
      earliestStart: earliestStart[t.id],
      finishDate: finishDate(t),
    }));

    return NextResponse.json({ todos: enriched, criticalPath });
  } catch (error) {
    return NextResponse.json(
      { error: "Error fetching todos" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { title, dueDate } = await request.json();
    if (!title || title.trim() === "") {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    // Fetch image from Pexels
    let imageUrl: string | null = null;
    try {
      const res = await fetch(
        `https://api.pexels.com/v1/search?query=${encodeURIComponent(
          title
        )}&per_page=1`,
        {
          headers: {
            Authorization: process.env.PEXELS_API_KEY!,
          },
        }
      );

      const data = await res.json();
      // console.log("PEXELS RESPONSE", data);
      // console.log("TEST---", data?.photos?.[0]?.src)
      imageUrl = data?.photos?.[0]?.src?.medium || null;
    } catch (err) {
      console.warn("Failed to fetch image from Pexels", err);
    }

    const todo = await prisma.todo.create({
      data: {
        title,
        dueDate: dueDate ? new Date(`${dueDate}T23:59`) : null, //local midnight
        imageUrl,
      },
    });

    return NextResponse.json(todo, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Error creating todo" }, { status: 500 });
  }
}
