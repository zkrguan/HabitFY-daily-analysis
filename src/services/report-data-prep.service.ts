import { startOfToday, startOfYesterday } from "date-fns";
import { client } from "../cosmos/connect";
import { PrismaClient } from '@prisma/client';
import { Goal, ProgressRecord, ReportData } from "../models/report-data-prep.interface";
const prisma = new PrismaClient();
const database = client.database('HabitFYDB');
const container = database.container('UserReportCache');

class ReportDataPrepService {
    static async prepReportData(){
        // Parse yesterday's and today's dates in UTC format
        const yesterdayUTC = startOfYesterday(); // Get yesterday's date at 12:00 AM UTC
        const todayUTC = startOfToday(); // Get today's date at 12:00 AM UTC
        // Step 1 use prisma to access the goal data and related ProgressRecord
        // Reminds me the old good time writing complicated queries.
        const activatedGoals = await prisma.goals.findMany({
            where:{
                IsActivated:true,
            },
            include:{
                ProgressRecords: {
                    where: { CreatedTime: 
                        // Greater OR EQUAL TO than yesterday's 12 am 
                        // Less than today's 12 am
                        {
                            gte: new Date (yesterdayUTC),
                            lt:new Date(todayUTC)
                        } 
                    }
                }
                // ProgressRecords:true
            }
        })
        // Step 2 Turning array of goals into a map 
        // Key is the user id 
        // Value is the array of Goals
        const userGoalsMap = new Map<string, Goal[]>();
        activatedGoals.map((ele:Goal)=>{
            const userGoalsArr = userGoalsMap.get(ele.ProfileId);
            if(userGoalsArr){
                userGoalsArr.push(ele);
            }
            else{
                userGoalsMap.set(ele.ProfileId,[ele]);
            }
        })
        console.log(userGoalsMap);

        // Step 3 
        const result = await this.prepareActivityStatistic(userGoalsMap)
        return {
          success: true,
          data:result
        };
    }
    static async persistReportData(){
        console.log(container)
        console.log(`persist now`)
    }

    // Connect to this after step 3
    private static async prepareActivityStatistic(goalMap: Map<string,Goal[]>){
        // If this is 
        const resultJson = {};
        goalMap.forEach((value:Goal[],key:string)=>{
            const temp = {
                planedToFinishGoalCount:0,
                actualFinishedGoalCount:0,
                reachedGoalStreak:0,
                beatingCompetitorPercentage:0
            } as ReportData;
            // When the goal array is not empty//
            // Meaning user actually set goals for target//
            if(value.length!==0){
              // Track how many goals user finished
              let finishedCount = 0;
              temp.planedToFinishGoalCount = value.length;
              value.forEach((goal: Goal) => {
                // User tracked value today
                const actualValue = goal.ProgressRecords.reduce(
                  (acc: number, curr: ProgressRecord) => {
                    return acc + curr.CompletedValue;
                  },
                  0,
                );
                // A boring language
                // Somehow I made it fun
                finishedCount += goal.IsQuitting
                  ? Number(goal.GoalValue > actualValue)
                  : Number(goal.GoalValue < actualValue);
              });
              temp.actualFinishedGoalCount = finishedCount;
              temp.reachedGoalStreak = Number(
                finishedCount === temp.planedToFinishGoalCount,
              );
            }
            resultJson[key] = temp;
        })
        return resultJson;
    }
}

export default ReportDataPrepService;