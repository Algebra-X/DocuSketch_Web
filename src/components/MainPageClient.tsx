"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/supabase/supabaseClient"; // ← новый импорт
import Button from "@/components/ui/CustomButton";

export default function MainPageClient() {
  const supabase = createClient();
  const router = useRouter();

  const [name, setName] = useState("");
  const [originalName, setOriginalName] = useState("");
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);      // пока грузим пользователя
  const [saving, setSaving] = useState(false);
  const showButton = editing || name !== originalName;

  useEffect(() => {
    (async () => {
      // проверяем сессию
      const { data: { session }, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr || !session) {
        router.replace("/login");
        return;
      }

      // получаем пользователя
      const { data: { user }, error: userErr } = await supabase.auth.getUser();
      if (userErr || !user) {
        router.replace("/login");
        return;
      }

      // читаем текущее имя из user_metadata
      const meta = (user.user_metadata ?? {}) as Record<string, any>;
      const currentName =
        meta.display_name ??
        meta.full_name ??
        meta.name ??
        ""; // можно fallback на user.email, если хочешь

      setName(currentName);
      setOriginalName(currentName);
      setLoading(false);
    })();
  }, [router, supabase]);

  const handleSave = async () => {
    setSaving(true);

    // на всякий случай убедимся, что юзер есть
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.replace("/login");
      return;
    }

    // обновляем user_metadata.display_name
    const { error } = await supabase.auth.updateUser({
      data: { display_name: name },
    });

    if (error) {
      console.error("Failed to update display_name:", error.message);
      alert("Не удалось сохранить имя: " + error.message);
      setSaving(false);
      return;
    }

    // обновим локальное состояние
    setOriginalName(name);
    setEditing(false);
    setSaving(false);
    alert("Имя успешно сохранено!");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center space-y-6 bg-gray-100 px-4">
      <h1 className="text-3xl font-bold">Welcome</h1>

      <div className="w-full max-w-md space-y-2">
        <label htmlFor="display-name" className="block text-sm font-medium text-black">
          Display name
        </label>

        <input
          id="display-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onFocus={() => setEditing(true)}
          className="w-full py-3 px-4 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-black"
          placeholder="Your name"
        />

        {showButton && (
          <Button
            text={saving ? "Saving..." : "Submit"}
            type="button"
            size="md"
            hoverColor="blue"
            className="bg-purple-600 text-white"
            onClick={handleSave}
            disabled={saving}
          />
        )}
      </div>
    </div>
  );
}
