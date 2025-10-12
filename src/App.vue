<template>
  <v-app>
    <AppHeader />
    <v-main class="bg-background">
      <router-view />
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import AppHeader from '@/components/layout/AppHeader.vue'
</script>