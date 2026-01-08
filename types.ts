
export enum MeetingPurpose {
  SHARE = '共有',
  CONSENSUS = '合意形成',
  DECISION = '意思決定',
  BRAINSTORM = 'ブレスト',
  ONE_ON_ONE = '1on1'
}

export enum MeetingResult {
  DECIDED = '意思決定できた',
  ACTION_SET = '次アクション決まった',
  SHARED_ONLY = '情報共有のみ',
  DERAILED = '脱線した/結論なし'
}

export enum Frequency {
  ONCE = '1回のみ',
  DAILY = '毎日 (平日20日)',
  WEEKLY = '週1',
  BIWEEKLY = '隔週',
  MONTHLY = '月1'
}

export interface Participant {
  id: string;
  role: string;
  hourlyRate: number;
  count: number;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  name: string;
  duration: number;
  frequency: Frequency;
  purpose: MeetingPurpose;
  result: MeetingResult;
  participants: Participant[];
  oneTimeCost: number;
  monthlyCost: number;
  annualCost: number;
  score: number;
}
