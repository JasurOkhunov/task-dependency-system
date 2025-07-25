import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Dependency } from '@prisma/client';

interface Params { params: { id: string } }

// POST /api/todos/:id/dep
// Body: { parentId: number }  meaning: task :id depends on parentId
export async function POST(req: Request, { params }: Params) {
  const childId = Number(params.id);
  const { parentId } = await req.json();

  if (!parentId || isNaN(childId)) {
    return NextResponse.json({ error: 'Invalid ids' }, { status: 400 });
  }
  if (parentId === childId) {
    return NextResponse.json({ error: 'Task cannot depend on itself' }, { status: 400 });
  }

  // 1. Ensure both tasks exist
  const [parent, child] = await Promise.all([
    prisma.todo.findUnique({ where: { id: parentId } }),
    prisma.todo.findUnique({ where: { id: childId } }),
  ]);
  if (!parent || !child) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  // 2. Cycle detection: adding edge parent -> child must NOT create a cycle.
  // If child can already reach parent through existing edges, adding this edge would cycle.
  const createsCycle = await wouldCreateCycle(parentId, childId);
  if (createsCycle) {
    return NextResponse.json({ error: 'Circular dependency detected' }, { status: 400 });
  }

  // 3. Create dependency
  const dep = await prisma.dependency.create({
    data: { parentId, childId },
  });

  return NextResponse.json(dep, { status: 201 });
}

// Simple DFS from child to see if we can reach parent
async function wouldCreateCycle(newParentId: number, childId: number): Promise<boolean> {
  // Build adjacency from existing dependencies (parent -> child)
  const deps: Dependency[] = await prisma.dependency.findMany();
  const graph = new Map<number, number[]>();
  deps.forEach(d => {
    if (!graph.has(d.parentId)) graph.set(d.parentId, []);
    graph.get(d.parentId)!.push(d.childId);
  });

  // Temporarily add the new edge
  if (!graph.has(newParentId)) graph.set(newParentId, []);
  graph.get(newParentId)!.push(childId);

  // Check if we can go from childId back to newParentId
  const stack = [childId];
  const visited = new Set<number>();
  while (stack.length) {
    const node = stack.pop()!;
    if (node === newParentId) return true;
    if (visited.has(node)) continue;
    visited.add(node);
    (graph.get(node) || []).forEach(n => stack.push(n));
  }
  return false;
}