"use client";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useRef } from "react";

export default function BlockEditor({
  content, onChange, editable = true,
}: {
  content: any;
  onChange?: (json: any) => void;
  editable?: boolean;
}) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: content ?? { type: "doc", content: [{ type: "paragraph" }] },
    editable,
    immediatelyRender: false,
    editorProps: { attributes: { class: "tiptap" } },
    onUpdate: ({ editor }) => onChange?.(editor.getJSON()),
  });

  // editable 변경 반영
  useEffect(() => {
    if (editor && editor.isEditable !== editable) editor.setEditable(editable);
  }, [editable, editor]);

  // 외부 content 변경 반영
  const lastSet = useRef<string>("");
  useEffect(() => {
    if (!editor) return;
    const json = JSON.stringify(content);
    if (json !== lastSet.current && json !== JSON.stringify(editor.getJSON())) {
      editor.commands.setContent(content ?? { type: "doc", content: [{ type: "paragraph" }] }, false);
      lastSet.current = json;
    }
  }, [content, editor]);

  return <EditorContent editor={editor} />;
}
