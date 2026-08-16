<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import BaseButton from "../../components/BaseButton.vue";
import { useAuthStore } from "../../stores/authStore";

const router = useRouter();
const authStore = useAuthStore();

const isLoggingOut = ref(false);

async function handleLogout() {
  isLoggingOut.value = true;
  try {
    await authStore.logout();
  } finally {
    isLoggingOut.value = false;
    router.push({ name: "login" });
  }
}
</script>

<template>
  <main class="mx-auto flex min-h-screen w-full max-w-sm flex-col px-6 pt-safe">
    <p class="pt-10 text-h4 font-extrabold text-primary-800">Dashboard User</p>

    <!-- Sementara: buat mastikan sesi & role kebaca benar saat tes login. -->
    <dl class="mt-6 rounded-xl bg-white p-4 text-body-sm text-neutral-900">
      <div class="flex justify-between gap-4">
        <dt class="text-neutral-600">Nama</dt>
        <dd class="font-semibold">{{ authStore.user?.name }}</dd>
      </div>
      <div class="mt-2 flex justify-between gap-4">
        <dt class="text-neutral-600">Email</dt>
        <dd class="font-semibold">{{ authStore.user?.email }}</dd>
      </div>
      <div class="mt-2 flex justify-between gap-4">
        <dt class="text-neutral-600">Role</dt>
        <dd class="font-semibold">{{ authStore.role }}</dd>
      </div>
    </dl>

    <BaseButton
      class="mt-6"
      label="Logout"
      variant="outline"
      :loading="isLoggingOut"
      @click="handleLogout"
    />
  </main>
</template>
