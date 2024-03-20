export interface Bucket{
    Id:string;
    goalFinishedRate:number;
}


export interface TrimmedUserProfile{
    Id:string;
    PostalCode:string;
}


export interface ReportData {
  planedToFinishGoalCount: number;
  actualFinishedGoalCount: number;
  reachedGoalStreak: number;
  beatingCompetitorPercentage: number;
  samePerformanceUsersCount: number;
  totalUserCountInPostalCode:number;
}

export interface Goal {
    Id: number;
    Description: string;
    StartDate: Date;
    EndDate: Date;
    LastUpdated: Date;
    CreatedTime: Date;
    IsActivated: boolean;
    IsQuitting: boolean;
    GoalValue: number;
    ProfileId: string;
    Unit: string;
    ProgressRecords: ProgressRecord[];
}

export interface ProgressRecord {
    Id: number;
    CreatedTime: Date;
    Notes: string;
    CompletedValue: number;
    GoalId: number;
}