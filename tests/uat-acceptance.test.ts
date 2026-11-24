// UAT coverage index: B01 billing.test; B02-B05 checkout.test; I01-I03 inventory.test;
// R01-R02 reports.test; A01 admin/inventory/reports.test; A02 below; A03 admin.test and below.
import assert from "node:assert/strict";
import { MockPosApiClient,resetDemoData } from "../src/services/mock/mockPosApiClient";
const data=new Map<string,string>();Object.assign(globalThis,{window:{},localStorage:{getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>data.set(k,v),removeItem:(k:string)=>data.delete(k)}});
async function main(){resetDemoData();const api=new MockPosApiClient();await api.login("admin","demo");assert.deepEqual((await api.getUsers()).map(x=>[x.id,x.role]),[[1,"ADMIN"],[2,"BILLING"],[3,"READ_ONLY"]]);assert.equal("createUser" in api,false);await assert.rejects(()=>api.updateUser(1,{is_active:false}));await api.logout();await api.login("cashier","demo");for(const request of [()=>api.getInventoryItems(),()=>api.getFinancialSummary({from:null,to:null}),()=>api.getUsers(),()=>api.getAuditLogs()])await assert.rejects(request,{status:403});console.log("UAT A02 and A03 passed; B01-B05, I01-I03, R01-R02 and A01 covered by tagged suites");}
main().catch(e=>{console.error(e);process.exitCode=1;});
