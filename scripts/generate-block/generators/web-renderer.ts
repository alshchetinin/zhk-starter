import path from "node:path";
import { writeFile, toPascalCase, buildTsFields } from "../utils.js";
import type { BlockInfo } from "../prompts.js";

export function generateWebRenderer(rootDir: string, block: BlockInfo): void {
  const pascal = toPascalCase(block.name);
  const filePath = path.join(
    rootDir,
    "apps/web/app/components/blocks/renderers",
    `${pascal}Block.vue`,
  );

  const tsFields = buildTsFields(block.fields);
  const hasRepeater = block.fields.some((f) => f.type === "repeater");
  const repeaterHasImage = hasRepeater && block.fields.find((f) => f.type === "repeater")?.subFields?.some((sf) => sf.type === "image");

  const scriptLines: string[] = [
    `<script setup lang="ts">`,
    `defineProps<{`,
    tsFields,
    `}>();`,
    ``,
  ];

  if (hasRepeater) {
    scriptLines.push(`const { fadeUp, staggerContainer, staggerChild } = useMotionPresets();`);
  } else {
    scriptLines.push(`const { fadeUp } = useMotionPresets();`);
  }

  scriptLines.push(`</script>`);

  const templateLines: string[] = [
    `<template>`,
    `  <div class="section">`,
    `    <div class="container-web">`,
  ];

  if (hasRepeater) {
    const repeater = block.fields.find((f) => f.type === "repeater")!;
    const headerFields = block.fields.filter((f) => f.type !== "repeater");

    if (headerFields.length > 0) {
      templateLines.push(
        `      <Motion as="div" v-bind="fadeUp">`,
        `        <!-- TODO: рендеринг полей: ${headerFields.map((f) => f.name).join(", ")} -->`,
        `        <pre class="rounded-xl bg-[var(--web-bg-muted)] p-4 text-sm">{{ ${headerFields.map((f) => f.name).join(", ")} }}</pre>`,
        `      </Motion>`,
        ``,
      );
    }

    templateLines.push(
      `      <Motion`,
      `        as="div"`,
      `        :variants="staggerContainer"`,
      `        initial="hidden"`,
      `        whileInView="show"`,
      `        :inViewOptions="{ once: true }"`,
      `        class="mt-8 grid gap-6 md:grid-cols-3"`,
      `      >`,
      `        <Motion`,
      `          as="div"`,
      `          v-for="(item, i) in ${repeater.name}"`,
      `          :key="i"`,
      `          :variants="staggerChild"`,
      `        >`,
    );

    if (repeaterHasImage) {
      const imageField = repeater.subFields!.find((sf) => sf.type === "image")!;
      const titleField = repeater.subFields!.find((sf) => sf.name === "title" || sf.name === "name");
      templateLines.push(
        `          <UiCard hoverable>`,
        `            <template #header>`,
        `              <AppImage :src="item.${imageField.name}" :alt="item.${titleField?.name ?? imageField.name}" :width="600" sizes="sm:100vw lg:33vw" :loading="i > 0 ? 'lazy' : 'eager'" class="aspect-[4/3] w-full object-cover" />`,
        `            </template>`,
        `            <!-- TODO: рендеринг содержимого карточки -->`,
        `            <pre class="text-sm">{{ item }}</pre>`,
        `          </UiCard>`,
      );
    } else {
      templateLines.push(
        `          <UiCard>`,
        `            <!-- TODO: рендеринг элемента repeater -->`,
        `            <pre class="text-sm">{{ item }}</pre>`,
        `          </UiCard>`,
      );
    }

    templateLines.push(
      `        </Motion>`,
      `      </Motion>`,
    );
  } else {
    templateLines.push(
      `      <Motion as="div" v-bind="fadeUp">`,
      `        <!-- TODO: реализовать рендеринг блока "${block.label}" -->`,
      `        <pre class="rounded-xl bg-[var(--web-bg-muted)] p-6 text-sm overflow-x-auto">{{ $props }}</pre>`,
      `      </Motion>`,
    );
  }

  templateLines.push(`    </div>`, `  </div>`, `</template>`, ``);

  const component = [...scriptLines, ``, ...templateLines].join("\n");
  writeFile(filePath, component);
}
