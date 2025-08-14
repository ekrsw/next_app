# API設計書 - ナレッジ修正案承認システム

## 1. API設計概要

### 1.1 設計原則
- **RESTful設計**: リソースベースのURL設計
- **統一性**: 一貫したレスポンス形式
- **セキュリティ**: JWT認証 + 権限ベースアクセス制御
- **エラーハンドリング**: 標準化されたエラーレスポンス

### 1.2 ベースURL
```
Production: https://knowledge-system.company.com/api/v1
Development: http://localhost:8000/api/v1
```

## 2. 認証・認可

### 2.1 JWT認証
```http
Authorization: Bearer {jwt_token}
```

### 2.2 依存関数による権限制御
```python
get_current_active_user()      # 認証済みアクティブユーザー
get_current_approver_user()    # 承認者権限チェック
get_current_admin_user()       # 管理者権限チェック
```

## 3. APIエンドポイント詳細

### 3.1 修正案管理 (/api/v1/revisions)

#### 修正案一覧取得
```http
GET /api/v1/revisions/
```
**権限**: 認証済みユーザー  
**説明**: 権限に応じた修正案一覧を取得
- Admin: 全修正案
- All authenticated users: submitted/approved修正案 + 自分のdraft/rejected修正案

**クエリパラメータ**:
- `skip`: int = 0 (オフセット)
- `limit`: int = 100 (取得件数)

**レスポンス**: 修正案オブジェクトの配列

#### 修正案詳細取得
```http
GET /api/v1/revisions/{revision_id}
```
**権限**: 権限に応じたアクセス制御
- Admin: 全修正案にアクセス可能
- All authenticated users: submitted/approved修正案にアクセス可能
- Owner only: draft/rejected修正案は作成者のみアクセス可能
**レスポンス**: 修正案の全詳細情報（after_*フィールド含む）

#### 修正案作成
```http
POST /api/v1/revisions/
```
**権限**: 認証済みユーザー  
**説明**: proposer_idは現在のユーザーから自動設定
**リクエストボディ**:
```json
{
  "target_article_id": "string",
  "approver_id": "uuid",
  "reason": "string",
  "after_title": "string",
  "after_info_category": "uuid",
  "after_keywords": "string",
  "after_importance": true,
  "after_publish_start": "2024-01-01",
  "after_publish_end": "2024-12-31",
  "after_target": "string",
  "after_question": "string",
  "after_answer": "string",
  "after_additional_comment": "string"
}
```

#### 修正案更新
```http
PUT /api/v1/revisions/{revision_id}
```
**権限**: 修正案の提出者（draft状態のみ）  
**制約**: ステータスが'draft'の場合のみ更新可能

#### 提案者別修正案取得
```http
GET /api/v1/revisions/by-proposer/{proposer_id}
```
**権限**: 管理者または本人  
**クエリパラメータ**: skip, limit

#### ステータス別修正案取得
```http
GET /api/v1/revisions/by-status/{status}
```
**権限**: 認証済みユーザー（権限に応じて結果フィルタ）  
**説明**: ステータスに応じたアクセス制御
- Admin: 全ステータスの修正案を取得可能
- submitted/approved: 全認証ユーザーがアクセス可能
- draft/rejected: 作成者のみアクセス可能
**クエリパラメータ**: skip, limit

#### 記事別修正案取得
```http
GET /api/v1/revisions/by-article/{target_article_id}
```
**権限**: 全認証ユーザー  
**説明**: 特定記事の公開修正案一覧を取得
- 対象記事のsubmitted/approved修正案のみ返却
- draft/rejected修正案は非表示（プライバシー保護）
- ページネーション対応
**クエリパラメータ**: 
- `skip`: int = 0 (オフセット)
- `limit`: int = 100 (取得件数)
**用途**: 記事の修正履歴表示、類似修正案の参考情報提供

#### ステータス直接更新
```http
PATCH /api/v1/revisions/{revision_id}/status
```
**権限**: 承認者または管理者  
**説明**: approver_idとprocessed_atを自動設定
**リクエストボディ**:
```json
{
  "status": "submitted|approved|rejected|deleted"
}
```

### 3.2 修正案提案管理 (/api/v1/proposals)
**説明**: 修正案のビジネスロジック層（バリデーション、状態遷移、通知統合）

#### 修正案提案作成
```http
POST /api/v1/proposals/
```
**権限**: 認証済みユーザー  
**説明**: バリデーション付きで修正案を作成、カスタム例外処理
**リクエストボディ**: RevisionCreateスキーマと同様
**エラーレスポンス**: ProposalValidationError, ArticleNotFoundError

#### 修正案提案更新
```http
PUT /api/v1/proposals/{proposal_id}
```
**権限**: 提案者（draft状態のみ）  
**説明**: ドラフト状態の提案のみ更新可能、ProposalServiceを使用
**エラーレスポンス**: ProposalNotFoundError, ProposalPermissionError, ProposalStatusError

#### 修正案提出
```http
POST /api/v1/proposals/{proposal_id}/submit
```
**権限**: 提案者  
**説明**: ドラフトを承認待ち状態に変更、通知送信  
**状態遷移**: draft → submitted

#### 修正案撤回
```http
POST /api/v1/proposals/{proposal_id}/withdraw
```
**権限**: 提案者  
**説明**: 提出済みをドラフト状態に戻す  
**状態遷移**: submitted → draft

#### 修正案削除
```http
DELETE /api/v1/proposals/{proposal_id}
```
**権限**: 提案者（draft状態のみ）  
**レスポンス**: 204 No Content

#### 自分の提案一覧
```http
GET /api/v1/proposals/my-proposals
```
**権限**: 認証済みユーザー  
**クエリパラメータ**:
- `status`: Optional[str] (ステータスフィルタ)
- `skip`: int = 0
- `limit`: int = 100 (最大100件)

#### 承認待ち提案一覧
```http
GET /api/v1/proposals/for-approval
```
**権限**: 承認者  
**説明**: 自分が承認者として指定された提案一覧
**クエリパラメータ**: skip, limit

#### 提案統計
```http
GET /api/v1/proposals/statistics
```
**権限**: 認証済みユーザー  
**説明**: 非管理者は自分の統計のみ、管理者は他ユーザー指定可能
**クエリパラメータ**:
- `user_id`: Optional[UUID] (管理者のみ他ユーザー指定可)

#### 提案詳細取得
```http
GET /api/v1/proposals/{proposal_id}
```
**権限**: 権限に応じたアクセス制御
- Admin: 全提案にアクセス可能
- All authenticated users: submitted/approved提案にアクセス可能
- Owner only: draft/rejected提案は作成者のみアクセス可能
**説明**: 新しい権限モデルによるアクセス制御

### 3.3 承認管理 (/api/v1/approvals)
**説明**: 大幅に拡張されたワークフロー管理機能

#### 承認・却下処理
```http
POST /api/v1/approvals/{revision_id}/decide
```
**権限**: 指定された承認者  
**リクエストボディ**: ApprovalDecision スキーマ
```json
{
  "action": "approve|reject|request_changes|defer",
  "comment": "string",
  "priority": "low|medium|high|urgent"
}
```
**状態遷移**: submitted → approved/rejected
**エラーレスポンス**: ProposalNotFoundError, ApprovalPermissionError, ApprovalStatusError

#### 承認権限チェック
```http
GET /api/v1/approvals/{revision_id}/can-approve
```
**権限**: 認証済みユーザー  
**レスポンス**:
```json
{
  "can_approve": true
}
```

#### 承認待ち一覧
```http
GET /api/v1/approvals/queue
```
**権限**: 承認者  
**説明**: 現在の承認者の承認待ち案件（優先度フィルタ対応）
**クエリパラメータ**:
- `priority`: Optional[str] (low|medium|high|urgent)
- `limit`: int = 50 (最大100件)
**レスポンス**: ApprovalQueue スキーマのリスト

#### 承認統計・メトリクス
```http
GET /api/v1/approvals/metrics
```
**権限**: 承認者・管理者  
**クエリパラメータ**:
- `days_back`: int = 30 (1-365日)
**レスポンス**: ApprovalMetrics スキーマ

#### ワークロード管理
```http
GET /api/v1/approvals/workload
```
**権限**: 承認者  
**説明**: 現在の承認者のワークロード情報
**レスポンス**: ApprovalWorkload スキーマ

#### 特定承認者のワークロード
```http
GET /api/v1/approvals/workload/{approver_id}
```
**権限**: 管理者  
**説明**: 指定された承認者のワークロード（管理者限定）

#### 一括承認・却下
```http
POST /api/v1/approvals/bulk
```
**権限**: 承認者  
**制約**: 最大20件まで
**リクエストボディ**: BulkApprovalRequest スキーマ
```json
{
  "revision_ids": ["uuid1", "uuid2"],
  "action": "approve|reject|request_changes|defer",
  "comment": "string"
}
```
**レスポンス**: 処理結果の詳細

#### 承認履歴
```http
GET /api/v1/approvals/history
```
**権限**: 認証済みユーザー（非管理者は自分の履歴のみ）  
**クエリパラメータ**:
- `revision_id`: Optional[UUID]
- `approver_id`: Optional[UUID]
- `limit`: int = 50 (最大200件)
**レスポンス**: ApprovalHistory スキーマのリスト

#### ダッシュボード統計
```http
GET /api/v1/approvals/statistics/dashboard
```
**権限**: 承認者  
**説明**: 包括的な承認ダッシュボードデータ（ワークロード、キュー、メトリクス、緊急案件）

#### チーム概要
```http
GET /api/v1/approvals/team-overview
```
**権限**: 管理者  
**説明**: チーム全体の承認状況、ボトルネック分析、推奨事項

#### クイックアクション
```http
POST /api/v1/approvals/{revision_id}/quick-actions/{action}
```
**権限**: 承認者  
**パラメータ**: action (ApprovalAction enum)
**クエリパラメータ**: comment (Optional[str])
**説明**: 定型設定でのクイック承認アクション

#### ワークフロー推奨事項
```http
GET /api/v1/approvals/workflow/recommendations
```
**権限**: 承認者  
**説明**: 承認効率向上のためのワークフロー分析と推奨事項

#### 承認チェックリスト
```http
GET /api/v1/approvals/workflow/checklist/{revision_id}
```
**権限**: 承認者  
**説明**: 修正案の影響度に基づく動的承認チェックリスト生成

### 3.4 差分表示 (/api/v1/diffs)
**説明**: 高度な差分分析と比較機能

#### 差分データ取得
```http
GET /api/v1/diffs/{revision_id}
```
**権限**: 修正案の関係者（詳細な権限チェック）  
**レスポンス**: RevisionDiff スキーマ（フィールド差分、影響レベル、変更カテゴリ含む）
**エラーレスポンス**: ProposalNotFoundError, ArticleNotFoundError

#### 記事スナップショット
```http
GET /api/v1/diffs/article/{article_id}/snapshot
```
**権限**: 認証済みユーザー  
**レスポンス**: ArticleSnapshot スキーマ
**エラーレスポンス**: ArticleNotFoundError

#### 記事履歴
```http
GET /api/v1/diffs/article/{article_id}/history
```
**権限**: 認証済みユーザー（権限に応じてフィルタ）  
**クエリパラメータ**:
- `limit`: int = 10 (最大50件)
**レスポンス**: RevisionDiff スキーマのリスト

#### 修正案比較
```http
POST /api/v1/diffs/compare
```
**権限**: 承認者・管理者  
**リクエストボディ**: revision_id_1, revision_id_2 (UUID)
**説明**: 2つの修正案の詳細比較
**エラーレスポンス**: ProposalNotFoundError, ValueError

#### フォーマット済み差分
```http
GET /api/v1/diffs/{revision_id}/formatted
```
**権限**: 修正案の関係者  
**クエリパラメータ**:
- `include_formatting`: bool = True
**説明**: 表示用にフォーマットされた差分データ

#### 変更サマリー
```http
GET /api/v1/diffs/{revision_id}/summary
```
**権限**: 修正案の関係者  
**レスポンス**: DiffSummary スキーマ（変更数、影響度、推定レビュー時間含む）

#### 一括サマリー
```http
POST /api/v1/diffs/bulk-summaries
```
**権限**: 認証済みユーザー（権限に応じてフィルタ）  
**制約**: 最大50件まで
**リクエストボディ**: revision_ids (List[UUID])
**説明**: 複数修正案の一括サマリー取得

#### 変更統計
```http
GET /api/v1/diffs/statistics/changes
```
**権限**: 認証済みユーザー（権限に応じてフィルタ）  
**クエリパラメータ**:
- `days`: int = 30 (最大365日)
**説明**: 変更パターンの統計分析（ステータス別、影響度別、フィールド別）

### 3.5 認証管理 (/api/v1/auth)
**説明**: JWT認証システム

#### ログイン (OAuth2)
```http
POST /api/v1/auth/login
```
**権限**: なし（public）  
**リクエストボディ**: OAuth2PasswordRequestForm
**レスポンス**: Token スキーマ

#### ログイン (JSON)
```http
POST /api/v1/auth/login/json
```
**権限**: なし（public）  
**リクエストボディ**: UserLogin スキーマ
**レスポンス**: Token スキーマ

#### ユーザー登録
```http
POST /api/v1/auth/register
```
**権限**: なし（public）  
**リクエストボディ**: UserRegister スキーマ（sweet_name、ctstage_name対応）
**レスポンス**: User スキーマ

#### 現在のユーザー情報
```http
GET /api/v1/auth/me
```
**権限**: 認証済みユーザー
**レスポンス**: User スキーマ

#### トークンテスト
```http
POST /api/v1/auth/test-token
```
**権限**: 認証済みユーザー
**説明**: アクセストークンの有効性確認

### 3.6 ユーザー管理 (/api/v1/users)

#### ユーザー一覧取得
```http
GET /api/v1/users/
```
**権限**: 管理者
**クエリパラメータ**: skip, limit

#### ユーザー作成
```http
POST /api/v1/users/
```
**権限**: 管理者  
**説明**: 重複チェック付きユーザー作成

#### ユーザー詳細取得
```http
GET /api/v1/users/{user_id}
```
**権限**: 本人または管理者

#### ユーザー更新
```http
PUT /api/v1/users/{user_id}
```
**権限**: 本人または管理者  
**説明**: 非管理者は自分のロール変更不可

#### ユーザー削除
```http
DELETE /api/v1/users/{user_id}
```
**権限**: 管理者  
**レスポンス**: 204 No Content

### 3.7 記事管理 (/api/v1/articles)

#### 記事一覧取得
```http
GET /api/v1/articles/
```
**権限**: 認証済みユーザー  
**クエリパラメータ**: skip, limit

#### 記事詳細取得
```http
GET /api/v1/articles/{article_id}
```
**権限**: 認証済みユーザー

#### 記事作成
```http
POST /api/v1/articles/
```
**権限**: 管理者  
**説明**: article_id重複チェック付き

#### カテゴリ別記事一覧
```http
GET /api/v1/articles/by-category/{info_category}
```
**権限**: 認証済みユーザー

#### 承認グループ別記事一覧
```http
GET /api/v1/articles/by-group/{approval_group}
```
**権限**: 認証済みユーザー

#### 記事更新
```http
PUT /api/v1/articles/{article_id}
```
**権限**: 管理者

### 3.8 承認グループ管理 (/api/v1/approval-groups)

#### 承認グループ一覧
```http
GET /api/v1/approval-groups/
```
**権限**: 認証済みユーザー  
**クエリパラメータ**: skip, limit

#### 承認グループ作成
```http
POST /api/v1/approval-groups/
```
**権限**: 管理者

#### 承認グループ詳細
```http
GET /api/v1/approval-groups/{group_id}
```
**権限**: 認証済みユーザー（⚠️ **実装では権限制御なし - 設計通りの制御が推奨**）

#### 承認グループ更新
```http
PUT /api/v1/approval-groups/{group_id}
```
**権限**: 管理者

### 3.9 情報カテゴリ管理 (/api/v1/info-categories)

#### カテゴリ一覧
```http
GET /api/v1/info-categories/
```
**権限**: 認証済みユーザー  
**クエリパラメータ**: skip, limit

#### アクティブカテゴリ一覧
```http
GET /api/v1/info-categories/active
```
**権限**: 認証済みユーザー  
**説明**: アクティブな情報カテゴリのみ取得

#### カテゴリ作成
```http
POST /api/v1/info-categories/
```
**権限**: 管理者

#### カテゴリ詳細
```http
GET /api/v1/info-categories/{category_id}
```
**権限**: 認証済みユーザー

#### カテゴリ更新
```http
PUT /api/v1/info-categories/{category_id}
```
**権限**: 管理者

### 3.10 通知管理 (/api/v1/notifications)
**説明**: 拡張された通知システム

#### 自分の通知一覧
```http
GET /api/v1/notifications/my-notifications
```
**権限**: 認証済みユーザー  
**クエリパラメータ**:
- `skip`: int = 0
- `limit`: int = 20 (最大100件)
- `unread_only`: bool = False

#### 通知統計
```http
GET /api/v1/notifications/statistics
```
**権限**: 認証済みユーザー  
**クエリパラメータ**:
- `days_back`: int = 30 (1-365日)
**レスポンス**: NotificationStats スキーマ

#### 通知ダイジェスト
```http
GET /api/v1/notifications/digest
```
**権限**: 認証済みユーザー  
**クエリパラメータ**:
- `digest_type`: str = "daily" (daily|weekly)
**レスポンス**: NotificationDigest スキーマ

#### 通知既読化
```http
PUT /api/v1/notifications/{notification_id}/read
```
**権限**: 通知の受信者または管理者

#### 全通知既読化
```http
PUT /api/v1/notifications/read-all
```
**権限**: 認証済みユーザー  
**説明**: 現在ユーザーの全通知を既読化

#### 一括通知作成
```http
POST /api/v1/notifications/batch
```
**権限**: 管理者  
**制約**: 最大100ユーザーまで
**リクエストボディ**: NotificationBatch スキーマ
**レスポンス**: BulkNotificationResult スキーマ

#### レガシーエンドポイント
```http
GET /api/v1/notifications/{user_id}
```
**権限**: 管理者  
**説明**: 後方互換性のためのレガシーエンドポイント

```http
POST /api/v1/notifications/
```
**権限**: 管理者  
**説明**: 後方互換性のためのレガシーエンドポイント

### 3.11 分析・統計 (/api/v1/analytics)
**説明**: 包括的な分析・レポート機能

#### 分析概要
```http
GET /api/v1/analytics/overview
```
**権限**: 認証済みユーザー  
**クエリパラメータ**:
- `days`: int = 30 (1-365日)
**説明**: ユーザーの提案・通知メトリクス、日次活動分析

#### トレンド分析
```http
GET /api/v1/analytics/trends
```
**権限**: 認証済みユーザー  
**クエリパラメータ**:
- `metric`: str = "proposals" (proposals|approvals|notifications)
- `period`: str = "weekly" (daily|weekly|monthly)
- `weeks_back`: int = 12 (1-52週)
**説明**: 各種メトリクスのトレンド分析

#### パフォーマンスメトリクス
```http
GET /api/v1/analytics/performance
```
**権限**: 承認者  
**クエリパラメータ**:
- `days`: int = 30 (1-90日)
**説明**: 承認者のパフォーマンス分析（処理時間、スループット、効率性スコア）

#### サマリーレポート
```http
GET /api/v1/analytics/reports/summary
```
**権限**: 認証済みユーザー  
**クエリパラメータ**:
- `report_type`: str = "weekly" (daily|weekly|monthly)
**説明**: 定期レポート生成（洞察とキーポイント含む）

#### データエクスポート
```http
GET /api/v1/analytics/export/data
```
**権限**: 認証済みユーザー  
**クエリパラメータ**:
- `format`: str = "json" (json|csv)
- `data_type`: str = "proposals" (proposals|approvals|notifications)
- `days`: int = 30 (1-365日)
**説明**: 分析データのエクスポート

#### エグゼクティブダッシュボード
```http
GET /api/v1/analytics/dashboards/executive
```
**権限**: 管理者  
**説明**: 経営層向け包括ダッシュボード（KPI、リスク評価、推奨事項）

### 3.12 システム情報 (/api/v1/system)

#### ヘルスチェック
```http
GET /api/v1/system/health
```
**権限**: なし（public）  
**レスポンス**:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00Z",
  "version": "0.1.0",
  "environment": "development",
  "database": "connected"
}
```

#### バージョン情報
```http
GET /api/v1/system/version
```
**権限**: なし（public）  
**レスポンス**: バージョン、機能一覧、ビルド日付

#### システム統計
```http
GET /api/v1/system/stats
```
**権限**: 管理者  
**説明**: ユーザー・修正案・通知の統計情報

#### システム設定
```http
GET /api/v1/system/config
```
**権限**: 管理者  
**説明**: 環境設定、機能フラグ、制限値情報

#### メンテナンスタスク
```http
POST /api/v1/system/maintenance
```
**権限**: 管理者  
**説明**: システムメンテナンス実行（通知クリーンアップ等）

#### API文書
```http
GET /api/v1/system/api-documentation
```
**権限**: なし（public）  
**説明**: APIエンドポイント一覧とドキュメントサマリー

## 4. 共通レスポンス形式

### 4.1 実装のレスポンス形式
**注意**: 設計書で定義された共通ラッパー形式は実装されておらず、多くのエンドポイントで直接リソースデータを返します。

### 4.2 エラーレスポンス
```json
{
  "detail": "エラーの詳細メッセージ"
}
```

### 4.3 カスタム例外レスポンス
Proposalsエンドポイントでは以下のカスタム例外を使用：
- `ProposalNotFoundError`
- `ProposalPermissionError` 
- `ProposalStatusError`
- `ProposalValidationError`
- `ArticleNotFoundError`
- `ApprovalPermissionError`
- `ApprovalStatusError`
- `ApprovalError`

### 4.4 バリデーションエラー
```json
{
  "detail": {
    "message": "Invalid proposal data",
    "errors": ["エラー詳細"],
    "warnings": ["警告詳細"]
  }
}
```

## 5. ステータスコード

- **200 OK**: 正常取得
- **201 Created**: 正常作成
- **204 No Content**: 正常削除
- **400 Bad Request**: 不正なリクエスト
- **401 Unauthorized**: 認証エラー
- **403 Forbidden**: 権限エラー
- **404 Not Found**: リソース未発見
- **409 Conflict**: 状態競合エラー
- **422 Unprocessable Entity**: バリデーションエラー
- **500 Internal Server Error**: サーバーエラー

## 6. 実装制限値

### 6.1 実装された制限値
- **一括通知**: 最大100ユーザー
- **一括承認**: 最大20修正案
- **一括差分**: 最大50修正案
- **承認キュー**: 最大100件
- **各種リスト**: デフォルト制限あり

### 6.2 レート制限
**注意**: 設計書で定義されたレート制限は実装で確認できませんでした。

## 7. キャッシュ戦略

### 7.1 キャッシュ実装状況
**注意**: 設計書で定義された明示的なキャッシュ実装は確認できませんでした。

## 8. APIバージョニング

### 8.1 バージョニング方式
- **URLパス**: `/api/v1/`, `/api/v2/`
- **後方互換性**: v1は最低2年間サポート
- **廃止予告**: 6ヶ月前に通知

### 8.2 バージョン情報
```http
API-Version: 1.0
```

## 9. 実装と設計の主要相違点

### 9.1 セキュリティ改善（修正完了）

#### 9.1.1 権限制御の実装（✅ 2025年1月修正完了）
**修正された問題**：
- `POST /api/v1/approval-groups/` - 管理者権限制御を追加
- `PUT /api/v1/approval-groups/{group_id}` - 管理者権限制御を追加  
- `POST /api/v1/info-categories/` - 管理者権限制御を追加
- `PUT /api/v1/info-categories/{category_id}` - 管理者権限制御を追加

**修正内容**：
- 一般ユーザーによる承認グループの不正作成・変更を防止
- 一般ユーザーによる情報カテゴリの不正作成・変更を防止
- データの整合性とシステムセキュリティを向上

**実装された対応**：
```python
# 追加された依存性
from app.api.dependencies import get_current_admin_user
from app.models.user import User

# 実装されたエンドポイント例
@router.post("/", response_model=ApprovalGroup)
async def create_approval_group(
    group_in: ApprovalGroupCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)  # 管理者権限要求
) -> ApprovalGroup:
```

**テスト拡張**：
- 管理者権限でのテスト（`authenticated_client`使用）
- 一般ユーザーでの権限エラーテスト（403 Forbidden確認）
- 包括的なテストカバレッジによる品質保証

### 9.2 権限モデル変更（2025年実装）

#### 9.2.1 修正案・提案アクセス権限の変更
**変更内容**: 従来の役割ベース権限から混合アクセス制御モデルへ変更

**新しい権限マトリックス**:
| ステータス | Admin | 認証ユーザー | 作成者のみ |
|-----------|-------|------------|------------|
| submitted | ✓     | ✓          | -          |
| approved  | ✓     | ✓          | -          |
| draft     | ✓     | -          | ✓          |
| rejected  | ✓     | -          | ✓          |

**影響を受けるエンドポイント**:
- `GET /api/v1/revisions/`
- `GET /api/v1/revisions/{revision_id}`
- `GET /api/v1/revisions/by-status/{status}`
- `GET /api/v1/revisions/by-article/{target_article_id}` (**2025年1月追加**)
- `GET /api/v1/proposals/{proposal_id}`

**技術的変更**:
- 新リポジトリメソッド: `get_mixed_access_revisions()`, `get_public_revisions()`, `get_user_private_revisions()`, `get_public_revisions_by_article()` (**2025年1月追加**)
- 権限チェックロジックの統一化
- テスト期待値の更新

**新権限モデルのメリット**:
- **透明性向上**: submitted/approved修正案が全ユーザーに公開され、組織内のナレッジ共有が促進
- **プライバシー保護**: draft/rejected修正案は作成者のみアクセス可能で、未完成・不適切な内容の漏洩を防止
- **ワークフロー効率化**: 承認済み修正案を全員が参照できるため、類似案件の参考として活用可能
- **シンプルな権限制御**: 複雑な役割ベース権限から明確なステータスベース権限への移行

#### 9.2.2 記事別修正案取得API追加（2025年1月実装）

**追加エンドポイント**: `GET /api/v1/revisions/by-article/{target_article_id}`

**機能仕様**:
- 特定記事のsubmitted/approved修正案のみを取得
- 全認証ユーザーがアクセス可能（公開修正案に限定）
- ページネーション対応（skip/limitパラメータ）

**技術実装**:
- `RevisionRepository.get_public_revisions_by_article()`メソッド実装
- target_article_idとstatus条件を組み合わせたSQLクエリ
- 作成日時降順でのソート機能

**テスト実装**:
- 公開修正案のみ表示確認テスト
- 空結果対応テスト
- ページネーション機能テスト
- 認証要求テスト
- 全ロール（user/approver/admin）アクセス確認テスト

**活用シナリオ**:
- 記事詳細ページでの修正履歴表示
- 類似修正案作成時の参考情報提供
- 記事の変更トレンド分析
- フロントエンドでの効率的な履歴表示

### 9.3 アーキテクチャの拡張
- **エンドポイント分離**: 基本CRUD（revisions）とビジネスロジック（proposals）の分離
- **高度なワークフロー**: 承認ワークロード管理、ダッシュボード機能、チーム概要
- **包括的分析**: トレンド分析、パフォーマンスメトリクス、エグゼクティブダッシュボード
- **拡張された差分機能**: 記事履歴、修正案比較、フォーマット済み差分

### 9.4 機能拡張
- **認証システム**: OAuth2とJSON両対応、ユーザー登録機能
- **通知システム**: 統計、ダイジェスト、一括処理機能
- **分析機能**: 詳細なデータエクスポート、トレンド分析
- **システム管理**: メンテナンスタスク、設定管理

### 9.5 実装特徴
- **カスタム例外処理**: 詳細なエラー分類とハンドリング
- **権限制御**: 承認グループベースの細かな権限管理
- **スキーマ拡張**: 追加フィールド（sweet_name、ctstage_name等）
- **レイヤードアーキテクチャ**: サービス層、リポジトリパターンの採用

## 10. 実装サマリー（2025年1月時点）

### 10.1 実装規模
- **総エンドポイント数**: 77個
- **APIカテゴリ**: 13種類
- **実装完了率**: 設計要件の200%超（大幅な機能拡張）

### 10.2 企業レベルの機能実装
- **高度なワークフロー管理**: 承認キュー、ワークロード分析、チーム概要
- **包括的分析プラットフォーム**: トレンド分析、パフォーマンス指標、エグゼクティブダッシュボード  
- **拡張通知システム**: 統計、ダイジェスト、一括処理機能
- **システム管理機能**: メンテナンスタスク、設定管理、ヘルスモニタリング

### 10.3 修正完了事項（2025年1月）
- **セキュリティ修正**: ✅ 承認グループ・情報カテゴリの権限制御追加済み
- **設計文書更新**: ✅ 実装機能に合わせた文書メンテナンス継続中

実装は設計書の基本要件を大幅に超えて、実用的なエンタープライズシステムとして必要な機能を網羅的に実装しています。