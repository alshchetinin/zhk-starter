<template>
  <div>
    <nav style="padding: 1rem; border-bottom: 1px solid #ccc; display: flex; gap: 1rem;">
      <NuxtLink to="/">Home</NuxtLink>
      <NuxtLink to="/projects">Projects</NuxtLink>
      <NuxtLink to="/news">News</NuxtLink>
      <NuxtLink to="/pages">Pages</NuxtLink>
      <NuxtLink to="/documents">Documents</NuxtLink>
      <NuxtLink to="/promotions">Promotions</NuxtLink>
    </nav>
    <main style="padding: 1rem;">
      <NuxtPage />
    </main>
  </div>
</template>
