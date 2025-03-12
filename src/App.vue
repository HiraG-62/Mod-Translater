<script setup lang="ts">
import { ref, onMounted } from 'vue'
import CommonDialog from './components/CommonDialog.vue'
import { TableItem } from './types/TableItem'
import { fileTranslate } from './utils/fileTranslate'

// テキスト入力のデータ
const txtFilePath = ref('')
const apiKey = ref('')
const apiDialog = ref(false)
const loading = ref(false)

// エラー通知用
const snackbar = ref(false)
const errorMessage = ref('')
const snackbarColor = ref('error')

// テーブルに表示するデータ（サンプル）
const items = ref<TableItem[]>([])

// ダイアログの制御
const dialog = ref(false)
const editingItem = ref<TableItem | null>(null)
const editingValue = ref('')

// テーブルのヘッダー情報（サンプル）
const headers = ref([
  { text: '項目名', value: 'name', width: '33%' },
  { text: '翻訳前', value: 'value', width: '33%' },
  { text: '翻訳後', value: 'translatedValue', width: '34%' },
])

// エラーメッセージを表示する関数
function showError(message: string) {
  errorMessage.value = message;
  snackbarColor.value = 'error';
  snackbar.value = true;
}

// 成功メッセージを表示する関数
function showSuccess(message: string) {
  errorMessage.value = message;
  snackbarColor.value = 'success';
  snackbar.value = true;
}

// API設定ダイアログを開く
onMounted(() => {
  try {
    // 保存されているAPIキーを読み込む
    loadApiKey();
    
    // メニューからのAPI設定ダイアログ表示
    (window as any).electronAPI.onOpenApiSettings(() => {
      try {
        apiDialog.value = true;
      } catch (error) {
        console.error('API設定ダイアログの表示中にエラーが発生しました:', error);
        showError('API設定ダイアログの表示中にエラーが発生しました');
      }
    });

    // メニューからの保存リクエスト
    (window as any).electronAPI.onSaveJsonRequest(() => {
      try {
        saveJsonData();
      } catch (error) {
        console.error('保存リクエスト処理中にエラーが発生しました:', error);
        showError('保存リクエスト処理中にエラーが発生しました');
      }
    });
  } catch (error) {
    console.error('アプリケーション初期化中にエラーが発生しました:', error);
    showError('アプリケーション初期化中にエラーが発生しました');
  }
});

// APIキーを読み込む
async function loadApiKey() {
  try {
    apiKey.value = await (window as any).electronAPI.loadApiKey();
  } catch (error) {
    console.error('APIキーの読み込み中にエラーが発生しました:', error);
    showError('APIキーの読み込み中にエラーが発生しました');
  }
}

// APIキーを保存
async function saveApiKey() {
  try {
    const success = await (window as any).electronAPI.saveApiKey(apiKey.value);
    if (success) {
      apiDialog.value = false;
      showSuccess('APIキーを保存しました');
    } else {
      console.error('APIキーの保存に失敗しました');
      showError('APIキーの保存に失敗しました');
    }
  } catch (error) {
    console.error('APIキーの保存中にエラーが発生しました:', error);
    showError('APIキーの保存中にエラーが発生しました');
  }
}

// 編集ダイアログを開く
function openEditDialog(item: TableItem) {
  try {
    if (!item) {
      console.error('編集対象のアイテムが見つかりません');
      showError('編集対象のアイテムが見つかりません');
      return;
    }
    editingItem.value = item;
    editingValue.value = item.translatedValue || '';
    dialog.value = true;
  } catch (error) {
    console.error('編集ダイアログの表示中にエラーが発生しました:', error);
    showError('編集ダイアログの表示中にエラーが発生しました');
  }
}

// 編集を保存
function saveEdit() {
  try {
    if (editingItem.value) {
      editingItem.value.translatedValue = editingValue.value;
    }
    console.log(items.value);
    dialog.value = false;
    showSuccess('編集内容を保存しました');
  } catch (error) {
    console.error('編集の保存中にエラーが発生しました:', error);
    showError('編集の保存中にエラーが発生しました');
  }
}

// ボタン押下時の動作例
async function onClickFolderSearch() {
  try {
    const filePath = await (window as any).electronAPI.openFile();
    if (filePath) {
      txtFilePath.value = filePath;
    }
  } catch (error) {
    console.error('ファイル選択エラー:', error);
    showError('ファイルの選択中にエラーが発生しました');
  }
}

async function onClickTranslate() {
  try {
    if (!apiKey.value) {
      console.warn('APIキーが設定されていません');
      showError('APIキーが設定されていません');
      apiDialog.value = true;
      return;
    }

    if (!txtFilePath.value) {
      console.error('ファイルパスが指定されていません');
      showError('ファイルパスが指定されていません');
      return;
    }

    loading.value = true;
    const fileContent = await (window as any).electronAPI.getFileContent(txtFilePath.value);
    if (!fileContent) {
      console.error('ファイルの内容を取得できませんでした');
      showError('ファイルの内容を取得できませんでした');
      return;
    }
    
    items.value = await fileTranslate(fileContent, apiKey.value);
    if (!items.value || items.value.length === 0) {
      console.warn('翻訳結果が空です');
      showError('翻訳結果が空です');
    } else {
      showSuccess('翻訳が完了しました');
    }
  } catch (error) {
    console.error('ファイル読み込みまたは翻訳中にエラーが発生しました:', error);
    showError('ファイル読み込みまたは翻訳中にエラーが発生しました');
  } finally {
    loading.value = false;
  }
}

// 翻訳データをJSONファイルとして保存
async function saveJsonData() {
  try {
    if (!items.value || items.value.length === 0) {
      console.warn('保存するデータがありません');
      showError('保存するデータがありません');
      return;
    }

    // 保存用のデータ形式に変換
    const saveData = items.value.reduce((acc, item) => {
      if (!item.name) {
        console.warn('項目名が空のデータがあります');
        return acc;
      }
      acc[item.name] = item.translatedValue || '';
      return acc;
    }, {} as Record<string, string>);

    // 保存するデータが空でないか確認
    if (Object.keys(saveData).length === 0) {
      console.warn('保存するデータが空です');
      showError('保存するデータが空です');
      return;
    }

    const success = await (window as any).electronAPI.saveJsonFile(saveData);
    if (success) {
      console.log('ファイルの保存に成功しました');
      showSuccess('ファイルの保存に成功しました');
    } else {
      console.error('ファイルの保存に失敗しました');
      showError('ファイルの保存に失敗しました');
    }
  } catch (error) {
    console.error('ファイルの保存中にエラーが発生しました:', error);
    showError('ファイルの保存中にエラーが発生しました');
  }
}
</script>

<template>
  <v-app style="overflow: hidden;">
    <!-- アプリバー（ヘッダー） -->
    <v-app-bar color="white" dark>
      <!-- テキスト入力 -->
      <v-text-field v-model="txtFilePath" label="ファイルパス" variant="outlined" density="comfortable" hide-details
        class="ml-4" />

      <!-- ボタン -->
      <v-btn color="secondary" variant="flat" class="mr-4" height="50" @click="onClickFolderSearch">
        <v-icon>mdi-folder-open</v-icon>
      </v-btn>
      <v-btn color="success" variant="flat" class="mr-4" height="50" width="100" @click="onClickTranslate">
        <v-icon>mdi-translate</v-icon><span class="ml-2">翻訳開始</span>
      </v-btn>
      <v-btn color="primary" variant="flat" class="mr-4" height="50" width="100" @click="saveJsonData">
        <v-icon>mdi-content-save</v-icon><span class="ml-2">保存</span>
      </v-btn>
    </v-app-bar>

    <v-main style="height: 100vh;">
      <v-container style="max-width: 95%; height: 100%;">
        <!-- ローディングオーバーレイ -->
        <v-overlay
          :model-value="loading"
          class="align-center justify-center"
        >
          <v-progress-circular
            color="primary"
            indeterminate
            size="64"
          ></v-progress-circular>
          <div class="text-h6 mt-4">翻訳中...</div>
        </v-overlay>

        <!-- エラー通知用スナックバー -->
        <v-snackbar
          v-model="snackbar"
          :color="snackbarColor"
          :timeout="3000"
          location="top"
        >
          {{ errorMessage }}
          <template v-slot:actions>
            <v-btn
              variant="text"
              @click="snackbar = false"
            >
              閉じる
            </v-btn>
          </template>
        </v-snackbar>

        <v-data-table
          :headers="headers"
          :items="items"
          class="mt-6"
          style="text-align: left;"
          fixed-header
          height="calc(100vh - 200px)"
          hide-default-footer
          :items-per-page="-1"
        >
          <template #headers>
            <tr>
              <th v-for="header in headers" :key="header.value" :style="{ width: header.width }">
                {{ header.text }}
              </th>
            </tr>
          </template>
          <template v-slot:item="{ item }">
            <tr>
              <td style="text-align: left; border: 1px solid #ccc; width: 33%;">{{ item.name }}</td>
              <td style="text-align: left; border: 1px solid #ccc; width: 33%;">{{ item.value }}</td>
              <td 
                style="text-align: left; border: 1px solid #ccc; width: 34%; cursor: pointer;"
                @click="openEditDialog(item)"
              >
                {{ item.translatedValue }}
              </td>
            </tr>
          </template>
        </v-data-table>

        <!-- API設定ダイアログ -->
        <CommonDialog
          v-model="apiDialog"
          title="API設定"
          @save="saveApiKey"
        >
          <v-text-field
            v-model="apiKey"
            label="APIキー"
            variant="outlined"
            placeholder="ここにAPIキーを入力してください"
            hide-details
          ></v-text-field>
        </CommonDialog>

        <!-- 編集ダイアログ -->
        <CommonDialog
          v-model="dialog"
          title="編集"
          @save="saveEdit"
        >
          <v-textarea
            v-model="editingValue"
            label="翻訳後"
            variant="outlined"
            auto-grow
            rows="3"
            row-height="24"
            class="translation-textarea"
          ></v-textarea>
        </CommonDialog>
      </v-container>
    </v-main>
  </v-app>
</template>

<style scoped>
.v-overlay {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

:deep(.translation-textarea) {
  width: 100%;
  max-height: 60vh;
  overflow-y: auto;
}

:deep(.translation-textarea .v-field__input) {
  white-space: pre-wrap;
  word-wrap: break-word;
  line-height: 1.5;
}
</style>
