/* eslint-disable @typescript-eslint/no-explicit-any */
import { startOfToday, startOfYesterday } from "date-fns";
import { client } from "../cosmos/connect";
import { PrismaClient } from '@prisma/client';
import { Bucket, Goal, ProgressRecord, ReportData, TrimmedUserProfile, UpdateCosmosError } from "../models/report-data-prep.interface";
const prisma = new PrismaClient();
const database = client.database('HabitFYDB');
const container = database.container('UserDailyReport');

class ReportDataPrepService {
    static async prepReportData(){
        let successCnt:number = 0;
        const errorArr:UpdateCosmosError[] = [] as UpdateCosmosError[];
        // Parse yesterday's and today's dates in UTC format
        const yesterdayUTC = startOfYesterday(); // Get yesterday's date at 12:00 AM UTC
        const todayUTC = startOfToday(); // Get today's date at 12:00 AM UTC
        // Step 1 use prisma to access the goal data and related ProgressRecord
        // Reminds me the old good time writing complicated queries.
        const activatedGoals = await prisma.goals.findMany({
            where:{
                IsActivated:true,
                Userprofiles:{
                    NeedReport:true,
                }
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
        // Step 3 turning Goals into Report Data
        // Key is still user id 
        // value is report data
        const result = await this.prepareActivityStatistic(userGoalsMap)
        
        // Step 4 calculating the user is doing better than how much percentage of users in 
        // that postal code
        const finalResult = await this.calculatingBetterThanPercent(result);

        // Step 5 upsert the user status by 
        for (const property in finalResult){
            try{
                await container.items.upsert({id:property,data:finalResult[property],postalCode:finalResult[property].postalCode});
                ++successCnt;
            }
            catch(err){
                errorArr.push({
                    id:property,
                    errorMessage:err
                })
            }
        }
    
        return {
          successCnt: successCnt,
          errors:errorArr
        };
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

    // userReportJson is more like a map but it is a JSON object.
    // Key is the userid, values are the Report Data
    private static async calculatingBetterThanPercent(userReportJson:any){
        // need to make a postal code is the key
        const userWithPostalCode = await prisma.userprofiles.findMany({
          where: { NeedReport: true  },
          select: {Id:true,PostalCode:true},
        });
        // first string is postal code
        // second string arr is the user name
        const userByPostalCodemap = new Map<string,Bucket[]>();
        userWithPostalCode.map((ele:TrimmedUserProfile)=>{
            let KPI:number = 0;
            if(userReportJson[ele.Id]){
                KPI = userReportJson[ele.Id].actualFinishedGoalCount/userReportJson[ele.Id].planedToFinishGoalCount
            }
            const foundBucket = userByPostalCodemap.get(ele.PostalCode.replace(' ',''));
            if (foundBucket){
                foundBucket.push({Id:ele.Id,goalFinishedRate:KPI});
            }
            else{
                userByPostalCodemap.set(
                    ele.PostalCode.replace(' ',''),
                    [{
                        Id:ele.Id,
                        goalFinishedRate:KPI,
                    }]
                ) ;
            }
        })
        // Looping through bucket, each element of the array. 
        // Use compare between each elements and decide who is better
        // console.log(userByPostalCodemap)
        userByPostalCodemap.forEach((bucketArr,postalCode)=>{
            bucketArr.map((ele:Bucket)=>{
                const foundVal = userReportJson[ele.Id]
                if(foundVal!==undefined){
                    foundVal.postalCode = postalCode;
                    foundVal.totalUserCountInPostalCode = bucketArr.length;
                    let sameCount = 0;
                    let beatCount = 0;
                    // If one postal bucket is having more than just one user 
                    if(bucketArr.length > 1){
                        bucketArr.forEach((innerBucket:Bucket)=>{
                            if(ele.Id != innerBucket.Id){
                                if(ele.goalFinishedRate > innerBucket.goalFinishedRate) {
                                    ++beatCount;
                                }
                                else if(ele.goalFinishedRate == innerBucket.goalFinishedRate){
                                    ++sameCount;
                                }
                            }
                        })
                        foundVal.beatingCompetitorPercentage = bucketArr.length-1 > 0? beatCount / (bucketArr.length-1) : 0;
                        foundVal.samePerformanceUsersCount = sameCount;
                    }
                    else{
                        foundVal.beatingCompetitorPercentage = foundVal.actualFinishedGoalCount > 0 ? 1:0;
                        foundVal.samePerformanceUsersCount = -1; // A flag val for front end, you can just show too less people to compare. 
                        foundVal.totalUserCountInPostalCode = -1; // A flag val for front end, you can just show too less people to compare. 
                    }
                }
            })
        })
        return userReportJson;
    }
}

export default ReportDataPrepService;