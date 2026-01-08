
import { MeetingPurpose, MeetingResult, Frequency } from './types';

export const ROLE_PRESETS = [
  { role: '経営層', hourlyRate: 12000 },
  { role: '部長', hourlyRate: 9000 },
  { role: 'マネージャ', hourlyRate: 7000 },
  { role: 'メンバー', hourlyRate: 4000 },
  { role: '外部', hourlyRate: 10000 },
];

export const FREQUENCY_FACTORS: Record<Frequency, number> = {
  [Frequency.ONCE]: 1,
  [Frequency.DAILY]: 20,
  [Frequency.WEEKLY]: 4.33,
  [Frequency.BIWEEKLY]: 2.16,
  [Frequency.MONTHLY]: 1,
};

export const SCORE_LOGIC: Record<MeetingPurpose, Record<MeetingResult, { score: number; advice: string }>> = {
  [MeetingPurpose.SHARE]: {
    [MeetingResult.DECIDED]: { score: 70, advice: "共有目的ですが意思決定まで至りました。次回からは非同期での共有を検討してください。" },
    [MeetingResult.ACTION_SET]: { score: 60, advice: "共有からアクションが生まれました。ドキュメントベースの共有で時間を短縮できる可能性があります。" },
    [MeetingResult.SHARED_ONLY]: { score: 40, advice: "単なる共有なら、Slackやメールなどの非同期ツールに切り替えることを強く推奨します。" },
    [MeetingResult.DERAILED]: { score: 10, advice: "共有目的で脱線するのは時間損失が大きいです。アジェンダを固定しましょう。" },
  },
  [MeetingPurpose.CONSENSUS]: {
    [MeetingResult.DECIDED]: { score: 90, advice: "非常に効率的です。合意形成がスムーズに行われました。" },
    [MeetingResult.ACTION_SET]: { score: 80, advice: "前向きな結果です。決定権限を持つ人を明確にすることでさらに加速します。" },
    [MeetingResult.SHARED_ONLY]: { score: 30, advice: "合意に至りませんでした。事前の資料読み込みを徹底してください。" },
    [MeetingResult.DERAILED]: { score: 10, advice: "論点が不明確です。会議前に反対意見を吸い上げておく必要があります。" },
  },
  [MeetingPurpose.DECISION]: {
    [MeetingResult.DECIDED]: { score: 100, advice: "完璧な会議です。決定事項の周知をすぐに行いましょう。" },
    [MeetingResult.ACTION_SET]: { score: 70, advice: "決定には至りませんでしたが、進捗はありました。次回は決着をつけましょう。" },
    [MeetingResult.SHARED_ONLY]: { score: 20, advice: "意思決定会議で共有のみに終わるのは失敗です。準備不足の疑いがあります。" },
    [MeetingResult.DERAILED]: { score: 5, advice: "最悪のパターンです。ファシリテーターの変更を検討してください。" },
  },
  [MeetingPurpose.BRAINSTORM]: {
    [MeetingResult.DECIDED]: { score: 85, advice: "ブレストから決定まで行えたのは素晴らしい成果です。" },
    [MeetingResult.ACTION_SET]: { score: 95, advice: "ブレストの理想的な姿です。出た案をすぐ実行に移しましょう。" },
    [MeetingResult.SHARED_ONLY]: { score: 50, advice: "刺激はありましたが、実利がありません。次は絞り込みの時間を設けてください。" },
    [MeetingResult.DERAILED]: { score: 20, advice: "発散しすぎました。タイムボックスを厳格に守ってください。" },
  },
  [MeetingPurpose.ONE_ON_ONE]: {
    [MeetingResult.DECIDED]: { score: 90, advice: "建設的な1on1です。メンバーの不安が解消されたか確認してください。" },
    [MeetingResult.ACTION_SET]: { score: 95, advice: "コーチングとして成功しています。目標設定と合意ができています。" },
    [MeetingResult.SHARED_ONLY]: { score: 60, advice: "報告会になっています。もっと深層の悩みやキャリアの話に時間を使ってください。" },
    [MeetingResult.DERAILED]: { score: 30, advice: "雑談で終わりました。リレーション構築ならOKですが、コスト意識は持ちましょう。" },
  },
};
