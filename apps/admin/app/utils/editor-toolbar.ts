export const toolbarItems = [
  [
    { kind: "heading" as const, level: 1, icon: "i-tabler-h-1", tooltip: { text: "Заголовок 1" } },
    { kind: "heading" as const, level: 2, icon: "i-tabler-h-2", tooltip: { text: "Заголовок 2" } },
    { kind: "heading" as const, level: 3, icon: "i-tabler-h-3", tooltip: { text: "Заголовок 3" } },
  ],
  [
    { kind: "mark" as const, mark: "bold", icon: "i-solar-text-bold-linear", tooltip: { text: "Жирный" } },
    { kind: "mark" as const, mark: "italic", icon: "i-solar-text-italic-linear", tooltip: { text: "Курсив" } },
    { kind: "mark" as const, mark: "strike", icon: "i-solar-text-cross-linear", tooltip: { text: "Зачёркнутый" } },
  ],
  [
    { kind: "bulletList" as const, icon: "i-solar-list-linear", tooltip: { text: "Маркированный список" } },
    { kind: "orderedList" as const, icon: "i-solar-list-down-linear", tooltip: { text: "Нумерованный список" } },
  ],
  [
    { kind: "blockquote" as const, icon: "i-tabler-blockquote", tooltip: { text: "Цитата" } },
    { kind: "link" as const, icon: "i-solar-link-linear", tooltip: { text: "Ссылка" } },
  ],
  [
    { kind: "undo" as const, icon: "i-solar-undo-left-linear", tooltip: { text: "Отменить" } },
    { kind: "redo" as const, icon: "i-solar-undo-right-linear", tooltip: { text: "Повторить" } },
  ],
];
