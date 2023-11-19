# cms-styler-sync
このツールは `admin.shop-pro.jp` のテンプレートをインポート・エクスポートするためのコマンドラインツールです。

## 機能

- テンプレートのインポート（サーバーからローカルへのダウンロード）
- テンプレートのエクスポート（ローカルからサーバーへのアップロード）

## コマンドラインオプション

- `-i, --id <id>`: ログインID
- `-p, --password <password>`: ログインパスワード
- `-u, --uid [uid]`: テンプレートUID（任意）
- `--import`: テンプレートのインポート
- `--export`: テンプレートのエクスポート

## インポートされるファイル

インポートを行うと、以下のファイルがローカルに書き出されます。各HTMLファイルとCSSファイルは、それぞれ対応するテンプレートのコンテンツを含んでいます。

| HTML                         | CSS                           | 説明                                    |
|------------------------------|-------------------------------|-----------------------------------------|
| `0_common.html`              | `0_common.css`                | 共通テンプレート                        |
| `1_top.html`                 | `1_top.css`                   | トップページテンプレート                |
| `2_product_detail.html`      | `2_product_detail.css`        | 商品詳細ページテンプレート              |
| `3_product_list.html`        | `3_product_list.css`          | 商品一覧ページテンプレート              |
| `4_trade_act.html`           | `4_trade_act.css`             | 注文手続きページテンプレート            |
| `5_product_search_results.html` | `5_product_search_results.css` | 商品検索結果ページテンプレート        |
| `6_option_stock_price.html`  | `6_option_stock_price.css`    | オプション別在庫・価格設定ページ        |
| `7_privacy_policy.html`      | `7_privacy_policy.css`        | プライバシーポリシーページテンプレート  |
| (なし)                       | `51_inquiry.css`              | お問い合わせページ                      |
| (なし)                       | `52_my_account_login.css`     | マイアカウントログインページ            |
| (なし)                       | `53_tell_a_friend.css`        | 友達に教えるページ                      |
| (なし)                       | `54_newsletter_subscribe_unsubscribe.css` | ニュースレター購読・解除ページ       |
| (なし)                       | `55_review.css`               | レビューページ                          |

## 使い方
### インポート

サーバーからローカルへテンプレートをインポートするには：

```
cms-styler-sync --import
```

### エクスポート

ローカルからサーバーへテンプレートをエクスポートするには：

```
cms-styler-sync --export
```

## その他

- ログインIDとパスワードはコマンドラインオプションで指定することも、プロンプトで入力することも可能です。
- オプション `--import` または `--export` は必須です。
- UIDが指定されていない場合は、現在ショップに設定されているテンプレートが処理の対象となります。

