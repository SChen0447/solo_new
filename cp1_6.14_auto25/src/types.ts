export interface Activity {
  id: string
  name: string
  date: string
  location: string
  maxParticipants: number
  code: string
  status: 'active' | 'cancelled'
  createdAt: string
}

export interface SignInRecord {
  id: string
  activityId: string
  name: string
  deviceId: string
  signInTime: string
}

export interface Feedback {
  id: string
  activityId: string
  deviceId: string
  organizationScore: number
  atmosphereScore: number
  suggestion: string
  createdAt: string
}

export interface ActivityDetail {
  activity: Activity
  signIns: SignInRecord[]
  feedbacks: Feedback[]
  signInCount: number
}
