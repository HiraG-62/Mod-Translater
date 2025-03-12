<script setup lang="ts">
interface Props {
  modelValue: boolean;
  title: string;
  maxWidth?: number | string;
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void;
  (e: 'save'): void;
}

const props = withDefaults(defineProps<Props>(), {
  maxWidth: '500px'
});

const emit = defineEmits<Emits>();

function close() {
  emit('update:modelValue', false);
}

function save() {
  emit('save');
}
</script>

<template>
  <v-dialog :model-value="modelValue" @update:model-value="close" :max-width="maxWidth">
    <v-card>
      <v-card-title>
        <span>{{ title }}</span>
      </v-card-title>

      <v-card-text>
        <v-container>
          <v-row>
            <v-col cols="12">
              <slot></slot>
            </v-col>
          </v-row>
        </v-container>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="error" variant="text" @click="close">キャンセル</v-btn>
        <v-btn color="success" variant="text" @click="save">保存</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template> 