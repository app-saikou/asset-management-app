// Supabaseエラーメッセージの日本語翻訳

export const translateErrorMessage = (message: string): string => {
  const errorTranslations: { [key: string]: string } = {
    // 認証エラー
    'Invalid login credentials':
      'メールアドレスまたはパスワードが正しくありません',
    'Email not confirmed': 'メールアドレスが確認されていません',
    'Too many requests':
      'リクエストが多すぎます。しばらく時間をおいてから再度お試しください',
    'User not found': 'ユーザーが見つかりません',

    // バリデーションエラー
    'Invalid email': '無効なメールアドレスです',
    'Password should be at least 6 characters':
      'パスワードは6文字以上で入力してください',
    'Unable to validate email address: invalid format':
      'メールアドレスの形式が正しくありません',
    'Signup requires a valid password': '有効なパスワードが必要です',
    'User already registered': 'このメールアドレスは既に登録されています',

    // ネットワークエラー
    'Failed to fetch':
      'ネットワークエラーが発生しました。インターネット接続を確認してください',
    'Network request failed': 'ネットワークエラーが発生しました',

    // その他のエラー
    'Something went wrong': '予期しないエラーが発生しました',
    'An unexpected error occurred': '予期しないエラーが発生しました',
  };

  // 部分一致で翻訳を試行
  for (const [english, japanese] of Object.entries(errorTranslations)) {
    if (message.includes(english)) {
      return japanese;
    }
  }

  // 翻訳が見つからない場合は元のメッセージを返す
  return message;
};
