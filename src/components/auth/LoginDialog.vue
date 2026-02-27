<template>
  <v-dialog v-model="dialog" max-width="400" persistent>
    <v-card>
      <v-card-title class="d-flex align-center pa-4">
        <v-icon icon="mdi-lock" class="mr-2" color="primary"></v-icon>
        <span class="text-h6">Login</span>
      </v-card-title>

      <v-divider></v-divider>

      <v-card-text class="pa-4">
        <p class="text-body-2 mb-4">
          Enter the admin password to access all streams and management features.
        </p>

        <v-form @submit.prevent="handleLogin">
          <v-text-field
            v-model="password"
            label="Password"
            :type="showPassword ? 'text' : 'password'"
            variant="outlined"
            density="comfortable"
            :error-messages="errorMessage"
            :loading="loading"
            autofocus
            @keyup.enter="handleLogin"
          >
            <template #prepend-inner>
              <v-icon icon="mdi-key"></v-icon>
            </template>
            <template #append-inner>
              <v-btn
                :icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
                variant="text"
                size="small"
                @click="showPassword = !showPassword"
              ></v-btn>
            </template>
          </v-text-field>
        </v-form>
      </v-card-text>

      <v-divider></v-divider>

      <v-card-actions class="pa-4">
        <v-spacer></v-spacer>
        <v-btn
          variant="text"
          @click="close"
          :disabled="loading"
        >
          Cancel
        </v-btn>
        <v-btn
          color="primary"
          variant="flat"
          @click="handleLogin"
          :loading="loading"
          :disabled="!password"
        >
          Login
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useStreamStore } from '@/stores/streams'

const authStore = useAuthStore()
const streamStore = useStreamStore()

const dialog = defineModel<boolean>({ default: false })
const password = ref('')
const showPassword = ref(false)
const loading = ref(false)
const errorMessage = ref('')

// Clear form when dialog opens
watch(dialog, (open) => {
  if (open) {
    password.value = ''
    errorMessage.value = ''
    showPassword.value = false
  }
})

async function handleLogin() {
  if (!password.value || loading.value) return

  loading.value = true
  errorMessage.value = ''

  try {
    const success = await authStore.login(password.value)
    if (success) {
      dialog.value = false
      // Refresh streams to show all streams (public + private)
      await streamStore.fetchStreams()
    } else {
      errorMessage.value = 'Invalid password'
    }
  } catch {
    errorMessage.value = 'Login failed. Please try again.'
  } finally {
    loading.value = false
  }
}

function close() {
  dialog.value = false
}
</script>
