import { describe, expect, it } from "vitest";
import { matchNavTitle } from "../page-title";

const items = [
  { label: "Дашборд", to: "/" },
  { label: "Проекты", to: "/projects" },
  { label: "Документация", to: "/dev/docs" },
  { label: "Блоки", to: "/dev/blocks" },
];

describe("matchNavTitle", () => {
  it('"/" матчит только пункт дашборда', () => {
    expect(matchNavTitle("/", items)).toBe("Дашборд");
  });

  it('пункт "/" не матчит другие пути', () => {
    expect(matchNavTitle("/projects", [{ label: "Дашборд", to: "/" }])).toBe(
      null,
    );
  });

  it("точное совпадение пути", () => {
    expect(matchNavTitle("/projects", items)).toBe("Проекты");
  });

  it("вложенный путь матчит по префиксу", () => {
    expect(matchNavTitle("/projects/abc-123/edit", items)).toBe("Проекты");
  });

  it("из совпавших побеждает самый длинный to", () => {
    const overlapping = [
      { label: "Документация", to: "/dev" },
      { label: "Блоки", to: "/dev/blocks" },
    ];
    expect(matchNavTitle("/dev/blocks/create", overlapping)).toBe("Блоки");
    // порядок пунктов не влияет
    expect(
      matchNavTitle("/dev/blocks/create", [...overlapping].reverse()),
    ).toBe("Блоки");
  });

  it("матчит только по границе сегмента: /projectsfoo не матчит /projects", () => {
    expect(matchNavTitle("/projectsfoo", items)).toBe(null);
  });

  it("нет совпадений → null", () => {
    expect(matchNavTitle("/unknown", items)).toBe(null);
  });
});
