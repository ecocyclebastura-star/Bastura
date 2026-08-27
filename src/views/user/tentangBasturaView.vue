<script setup lang="ts">
import PageHeader from "../../components/PageHeader.vue";
import {
  ABOUT_FEATURES,
  ABOUT_INTRO,
  ABOUT_OUTRO,
} from "../../constants/helpCenter";
</script>

<template>
  <main class="mx-auto flex w-full max-w-sm flex-col px-6 pt-safe">
    <PageHeader fallback="user-pusat-bantuan" />

    <article class="pb-8">
      <h1 class="mt-2 text-h4 font-extrabold text-neutral-900">
        Tentang Bastura
      </h1>

      <p class="mt-3 text-body-sm text-justify text-neutral-800">
        {{ ABOUT_INTRO }}
      </p>

      <p
        v-for="feature in ABOUT_FEATURES"
        :key="feature.title"
        class="mt-4 text-body-sm text-justify text-neutral-800"
      >
        <strong class="font-bold text-neutral-900">{{ feature.title }}</strong>
        {{ feature.body }}
      </p>

      <p class="mt-4 text-body-sm text-justify text-neutral-800">
        {{ ABOUT_OUTRO }}
      </p>
    </article>
  </main>
</template>
