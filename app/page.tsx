"use client";
import { Todo } from "@prisma/client";
import { useState, useEffect } from "react";
import ReactFlow, { Background } from "reactflow";
import "reactflow/dist/style.css";

export default function Home() {
  const [newTodo, setNewTodo] = useState("");
  const [todos, setTodos] = useState([]);
  const [due, setDue] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedDeps, setSelectedDeps] = useState<number[]>([]);
  const [criticalPath, setCriticalPath] = useState<number[]>([]);

  useEffect(() => {
    fetchTodos();
  }, []);

  const fetchTodos = async () => {
    try {
      const res = await fetch("/api/todos");
      const data = await res.json();
      // data = { todos: [...], criticalPath: [...] }
      setTodos(data.todos || []);
      setCriticalPath(data.criticalPath || []);
    } catch (error) {
      console.error("Failed to fetch todos:", error);
    }
  };

  const handleAddTodo = async () => {
    if (!newTodo.trim()) return;
    try {
      setLoading(true);
      const createRes = await fetch("/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTodo, dueDate: due || null }),
      });
      const created = await createRes.json();

      // Add dependencies
      for (const parentId of selectedDeps) {
        const depRes = await fetch(`/api/todos/${created.id}/dep`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ parentId }),
        });
        if (!depRes.ok) {
          console.error("Failed to create dependency", await depRes.text());
        }
      }

      setNewTodo("");
      setDue("");
      setSelectedDeps([]);
      await fetchTodos();
    } catch (error) {
      console.error("Failed to add todo:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTodo = async (id: any) => {
    try {
      await fetch(`/api/todos/${id}`, {
        method: "DELETE",
      });
      fetchTodos();
    } catch (error) {
      console.error("Failed to delete todo:", error);
    }
  };

  // Dependency Graph component
  function Graph({
    todos,
    criticalPath,
  }: {
    todos: any[];
    criticalPath: number[];
  }) {
    // Build nodes
    const nodes = todos.map((t: any, index: number) => ({
      id: t.id.toString(),
      data: {
        label: (
          <div
            className={
              criticalPath.includes(t.id) ? "font-bold text-red-600" : ""
            }
          >
            <div>{t.title}</div>
            {t.dueDate && (
              <div className="text-[10px]">
                Due: {new Date(t.dueDate).toLocaleDateString()}
              </div>
            )}
          </div>
        ),
      },
      position: { x: (index % 5) * 180, y: Math.floor(index / 5) * 120 },
      style: criticalPath.includes(t.id)
        ? { border: "2px solid red", padding: 4 }
        : { padding: 4 },
    }));

    // Build edges from parents
    const edges: any[] = [];
    todos.forEach((t: any) => {
      (t.parents || []).forEach((d: any) => {
        const isCritical = isCriticalEdge(d.parentId, t.id, criticalPath);
        edges.push({
          id: `${d.parentId}-${t.id}`,
          source: d.parentId.toString(),
          target: t.id.toString(),
          animated: isCritical,
          style: isCritical ? { stroke: "red", strokeWidth: 2 } : {},
        });
      });
    });

    return (
      <ReactFlow nodes={nodes} edges={edges} fitView>
        <Background />
      </ReactFlow>
    );
  }

  function isCriticalEdge(parentId: number, childId: number, path: number[]) {
    for (let i = 0; i < path.length - 1; i++) {
      if (path[i] === parentId && path[i + 1] === childId) return true;
    }
    return false;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-500 to-red-500 flex flex-col items-center p-4">
      <div className="w-full max-w-md">
        <h1 className="text-4xl font-bold text-center text-white mb-8">
          Things To Do App
        </h1>

        {/* Create Task Form */}
        <div className="flex flex-col gap-3 mb-6">
          <div className="flex">
            <input
              type="text"
              className="flex-grow p-3 rounded-l-full focus:outline-none text-gray-700"
              placeholder="Add a new todo"
              value={newTodo}
              onChange={(e) => setNewTodo(e.target.value)}
            />
            <input
              type="date"
              className="p-3 text-gray-700"
              value={due}
              onChange={(e) => setDue(e.target.value)}
            />
            <button
              onClick={handleAddTodo}
              className="bg-white text-indigo-600 p-3 rounded-r-full hover:bg-gray-100 transition duration-300"
            >
              Add
            </button>
          </div>
          {/* Dependency Selection */}
          <div className="bg-white p-3 rounded shadow text-sm">
            <p className="font-semibold mb-2">
              Dependencies (this new task depends on):
            </p>
            <div className="max-h-32 overflow-y-auto flex flex-col gap-1">
              {todos.map((t: any) => (
                <label key={t.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    value={t.id}
                    checked={selectedDeps.includes(t.id)}
                    onChange={(e) => {
                      const id = Number(e.target.value);
                      setSelectedDeps((prev) =>
                        e.target.checked
                          ? [...prev, id]
                          : prev.filter((p) => p !== id)
                      );
                    }}
                  />
                  <span>{t.title}</span>
                </label>
              ))}
            </div>
          </div>
          {loading && (
            <li className="bg-white bg-opacity-90 p-4 mb-4 rounded-lg shadow-lg flex items-center justify-center">
              <span className="text-gray-500 italic">
                Creating task and loading image...
              </span>
            </li>
          )}
          <ul>
            {todos.map((todo: any) => (
              <li
                key={todo.id}
                className="flex bg-white bg-opacity-90 p-4 mb-4 rounded-lg shadow-lg items-start"
              >
                {/* Image */}
                {todo.imageUrl && (
                  <img
                    src={todo.imageUrl}
                    alt="Task image"
                    className="w-40 h-28 object-cover rounded mr-4"
                  />
                )}

                {/* Content */}
                <div className="flex-1 flex flex-col">
                  <div className="flex justify-between items-start">
                    <span className="text-gray-800 font-medium">
                      {todo.title}
                    </span>
                    <button
                      onClick={() => handleDeleteTodo(todo.id)}
                      className="text-red-500 hover:text-red-700 ml-4"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>

                  {todo.dueDate && (
                    <span
                      className={`text-sm mt-1 ${
                        new Date(todo.dueDate) < new Date()
                          ? "text-red-600"
                          : "text-gray-500"
                      }`}
                    >
                      Due:{" "}
                      {new Date(todo.dueDate).toLocaleString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true,
                      })}
                    </span>
                  )}
                  {todo.earliestStart && (
                    <span className="text-xs text-gray-400 mt-1">
                      Earliest Start:{" "}
                      {new Date(todo.earliestStart).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
        {/* Dependency Graph */}
        <div className="mt-8 bg-white p-3 rounded shadow h-96">
          <h2 className="font-semibold mb-2">Dependency Graph</h2>
          <Graph todos={todos} criticalPath={criticalPath} />
        </div>
      </div>
    </div>
  );
}
