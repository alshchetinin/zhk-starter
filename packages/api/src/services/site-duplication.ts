import type { ContentBlock } from "@zhk/db/schema";
import { allBlocks } from "../shared/blocks";

/**
 * Индекс: тип блока → (имя поля → тип поля).
 * Строится из деклараций блоков один раз и переиспользуется.
 */
export function buildBlockFieldIndex(): Map<string, Map<string, string>> {
  const index = new Map<string, Map<string, string>>();
  for (const b of allBlocks) {
    const fields = new Map<string, string>();
    for (const f of b.fields) fields.set(f.name, f.type);
    index.set(b.type, fields);
  }
  return index;
}

/**
 * Ремап ссылок внутри блоков контента: поля типа `contacts` (массив id)
 * переводятся в новые id по карте `contactsMap`; `project`-поля и всё
 * остальное — остаются без изменений. Чистая функция (не мутирует входные данные).
 *
 * @param blocks       - массив блоков (null/undefined → пустой массив)
 * @param contactsMap  - Map<старый contactId, новый contactId>
 * @param fieldIndex   - результат buildBlockFieldIndex()
 */
export function remapBlockReferences(
  blocks: ContentBlock[] | null | undefined,
  contactsMap: Map<string, string>,
  fieldIndex: Map<string, Map<string, string>>,
): ContentBlock[] {
  if (!blocks) return [];
  return blocks.map((block) => {
    const fields = fieldIndex.get(block.type);
    if (!fields) return block;
    const data: Record<string, unknown> = { ...block.data };
    for (const [name, type] of fields) {
      if (type !== "contacts") continue;
      const val = data[name];
      if (typeof val === "string") {
        data[name] = contactsMap.get(val) ?? val;
      } else if (Array.isArray(val)) {
        data[name] = val.map((id) =>
          typeof id === "string" ? (contactsMap.get(id) ?? id) : id,
        );
      }
    }
    return { ...block, data };
  });
}
