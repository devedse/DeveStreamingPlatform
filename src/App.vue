<template>
  <v-app>
    <AppHeader v-if="!isMultiStreamView" />
    <v-main class="bg-background">
      <router-view />
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppHeader from '@/components/layout/AppHeader.vue'

const route = useRoute()
const isMultiStreamView = computed(() => route.name === 'multi-stream')
</script>