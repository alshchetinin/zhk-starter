export const toolbarItems = [
  [
    { kind: "heading" as const, level: 1, icon: "i-tabler-h-1", tooltip: { text: "Заголовок 1" } },
    { kind: "heading" as const, level: 2, icon: "i-tabler-h-2", tooltip: { text: "Заголовок 2" } },
    { kind: "heading" as const, level: 3, icon: "i-tabler-h-3", tooltip: { text: "Заголовок 3" } },
  ],
  [
    { kind: "mark" as const, mark: "bold", icon: "i-tabler-bold", tooltip: { text: "Жирный" } },
    { kind: "mark" as const, mark: "italic", icon: "i-tabler-italic", tooltip: { text: "Курсив" } },
    { kind: "mark" as const, mark: "strike", icon: "i-tabler-strikethrough", tooltip: { text: "Зачёркнутый" } },
  ],
  [
    { kind: "bulletList" as const, icon: "i-tabler-list", tooltip: { text: "Маркированный список" } },
    { kind: "orderedList" as const, icon: "i-tabler-list-numbers", tooltip: { text: "Нумерованный список" } },
  ],
  [
    { kind: "blockquote" as const, icon: "i-tabler-blockquote", tooltip: { text: "Цитата" } },
    { kind: "link" as const, icon: "i-tabler-link", tooltip: { text: "Ссылка" } },
  ],
  [
    { kind: "undo" as const, icon: "i-tabler-arrow-back-up", tooltip: { text: "Отменить" } },
    { kind: "redo" as const, icon: "i-tabler-arrow-forward-up", tooltip: { text: "Повторить" } },
  ],
];
