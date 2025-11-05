"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/supabase/supabaseClient";
import { Plus, Trash2 } from "lucide-react";

type Todo = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  completed: boolean;
  due_date: string | null;
  priority: "low" | "medium" | "high" | null;
  created_at: string;
  updated_at: string;
};

type Draft = Partial<Pick<Todo, "title" | "description" | "completed" | "priority" | "due_date">> & {
  editing?: boolean;
  dirty?: boolean;
};

export default function TodosClient() {
  const supabase = createClient();

  const [userId, setUserId] = useState<string | null>(null);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});

  const fmt = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }),
    []
  );

  // current user
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);
    })();
  }, [supabase]);

  const loadTodos = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("todos")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (!error && data) setTodos(data as Todo[]);
    setLoading(false);
  }, [supabase, userId]);

  useEffect(() => {
    loadTodos();
  }, [loadTodos]);

  // helpers
  const startEdit = (id: string) =>
    setDrafts((d) => ({ ...d, [id]: { ...(d[id] ?? {}), editing: true } }));

  const changeDraft = (id: string, patch: Draft) =>
    setDrafts((d) => ({
      ...d,
      [id]: { ...(d[id] ?? {}), ...patch, dirty: true },
    }));

  const merged = (t: Todo): Todo => {
    const d = drafts[t.id] ?? {};
    return { ...t, ...d } as Todo;
  };

  // create
  async function createTodo() {
    if (!userId || creating) return;
    setCreating(true);
    const { data, error } = await supabase
      .from("todos")
      .insert({
        user_id: userId,
        title: "New task",
        description: "",
        completed: false,
        priority: "medium",
      })
      .select("*")
      .single();

    setCreating(false);
    if (!error && data) {
      const newTodo = data as Todo;
      setTodos((prev) => [newTodo, ...prev]);
      // сразу в режим редактирования
      setDrafts((d) => ({ ...d, [newTodo.id]: { editing: true } }));
    }
  }

  // save
  async function saveTodo(id: string) {
    const t = todos.find((x) => x.id === id);
    if (!t) return;

    const d = drafts[id] ?? {};
    const next = { ...t, ...d } as Todo;

    const title = next.title?.trim().slice(0, 200) ?? "";
    if (!title) {
      alert("Title cannot be empty");
      return;
    }

    // вычислим патч только из изменённых полей
    const patch: Draft = {};
    if (title !== t.title) patch.title = title;
    if ((next.description ?? "") !== (t.description ?? "")) patch.description = next.description ?? "";
    if ((next.priority ?? null) !== (t.priority ?? null)) patch.priority = next.priority ?? null;
    if ((next.completed ?? false) !== (t.completed ?? false)) patch.completed = !!next.completed;
    if ((next.due_date ?? null) !== (t.due_date ?? null)) patch.due_date = next.due_date ?? null;

    if (Object.keys(patch).length === 0) {
      // ничего не поменялось
      setDrafts((d0) => ({ ...d0, [id]: { editing: false, dirty: false } }));
      return;
    }

    const { error } = await supabase.from("todos").update(patch).eq("id", id);
    if (error) {
      alert(error.message);
      return;
    }

    // применяем локально
    setTodos((prev) => prev.map((x) => (x.id === id ? ({ ...x, ...patch } as Todo) : x)));
    setDrafts((d0) => ({ ...d0, [id]: { editing: false, dirty: false } }));
  }

  // delete
  async function deleteTodo(id: string) {
    const backup = todos;
    setTodos((prev) => prev.filter((t) => t.id !== id));
    const { error } = await supabase.from("todos").delete().eq("id", id);
    if (error) {
      setTodos(backup);
      alert(error.message);
    }
    setDrafts((d) => {
      const { [id]: _, ...rest } = d;
      return rest;
    });
  }

  if (!userId) {
    return (
      <main className="min-h-screen grid place-items-center">
        <p>Loading…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-semibold">My Todos</h1>
          <button
            onClick={createTodo}
            disabled={creating}
            className="inline-flex items-center gap-2 rounded-xl bg-black px-4 py-2 text-white hover:opacity-90 disabled:opacity-60"
            title="Add new"
          >
            <Plus size={18} />
            Add
          </button>
        </header>

        {loading ? (
          <p className="text-gray-500">Loading…</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {/* карточка-добавлялка */}
            <button
              onClick={createTodo}
              disabled={creating}
              className="flex aspect-[4/3] w-full items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-white p-4 text-gray-500 hover:border-gray-400 hover:text-gray-700 disabled:opacity-60"
              title="Add new"
            >
              <div className="flex flex-col items-center gap-2">
                <Plus />
                <span>New card</span>
              </div>
            </button>

            {todos.map((todo) => {
              const d = drafts[todo.id] ?? {};
              const isEditing = !!d.editing;
              const isDirty = !!d.dirty;
              const view = merged(todo); // то, что показываем в UI
              const completed = !!view.completed;

              return (
                <article
                  key={todo.id}
                  className={[
                    "flex w-full flex-col rounded-2xl border border-gray-200 bg-white p-4 shadow-sm overflow-hidden",
                    completed && !isEditing ? "opacity-60 grayscale" : "",
                  ].join(" ")}
                >
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <input
                      className={[
                        "w-full rounded-lg border border-transparent bg-transparent text-lg font-medium outline-none focus:border-gray-300",
                        completed && !isEditing ? "line-through" : "",
                      ].join(" ")}
                      value={view.title}
                      onFocus={() => startEdit(todo.id)}
                      onChange={(e) => changeDraft(todo.id, { title: e.target.value })}
                      onKeyDown={(e) => {
                        // Enter просто убираем фокус, сохранение — только кнопкой
                        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                      }}
                      placeholder="Title"
                    />

                    <button
                      onClick={() => deleteTodo(todo.id)}
                      className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-red-600 shrink-0"
                      title="Delete"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>

                  <p className="mb-2 text-xs text-gray-500">
                    Created: {fmt.format(new Date(todo.created_at))}
                  </p>

                  <textarea
                    className="mb-3 min-h-[120px] resize-none rounded-lg border border-gray-200 p-2 outline-none focus:border-gray-300"
                    value={view.description ?? ""}
                    onFocus={() => startEdit(todo.id)}
                    onChange={(e) => changeDraft(todo.id, { description: e.target.value })}
                    placeholder="Details…"
                  />

                  <div className="mt-auto flex flex-wrap items-center justify-between gap-2">
                    <label className="inline-flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        className="size-4 rounded border-gray-300"
                        checked={completed}
                        onChange={(e) =>
                          changeDraft(todo.id, { completed: e.target.checked })
                        }
                        onFocus={() => startEdit(todo.id)}
                      />
                      <span className="text-sm text-gray-600">Completed</span>
                    </label>

                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        className="rounded-lg border border-gray-200 px-2 py-1 text-sm focus:border-gray-300 shrink-0 max-w-[140px]"
                        value={view.priority ?? "medium"}
                        onChange={(e) =>
                          changeDraft(todo.id, {
                            priority: e.target.value as Todo["priority"],
                          })
                        }
                        onFocus={() => startEdit(todo.id)}
                      >
                        <option value="low">low</option>
                        <option value="medium">medium</option>
                        <option value="high">high</option>
                      </select>

                      {/* SAVE only in edit mode */}
                      {isEditing && (
                        <button
                          onClick={() => saveTodo(todo.id)}
                          disabled={!isDirty}
                          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50"
                          title="Save changes"
                        >
                          Save
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
