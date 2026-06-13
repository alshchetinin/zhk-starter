<script setup lang="ts">
const gate = useSiteGate();
const url = useRequestURL();
const { socials } = useSiteContacts();

useJsonLd(() => {
  const org = gate.value?.seo?.organization;
  if (!org) return null;
  return buildOrganizationJsonLd({
    name: org.name,
    url: url.origin,
    legalName: org.legalName,
    logo: org.logo,
    phone: org.phone,
    email: org.email,
    address: org.address,
    sameAs: socials.value.map((s) => s.link),
  });
});

useJsonLd(() =>
  gate.value ? buildWebSiteJsonLd({ name: gate.value.name, url: url.origin }) : null,
);
</script>

<template>
  <div v-if="false" />
</template>
