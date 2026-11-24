"use client";
import { createContext,useContext,useEffect,useRef,useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api,dataMode } from "@/services/api";
import { onSessionExpired } from "@/services/api/session";
import { resetDemoData } from "@/services/mock/mockPosApiClient";
import type { User } from "@/types/domain";
type Auth={user:User|null;ready:boolean;login:(username:string,password:string)=>Promise<void>;logout:()=>Promise<void>;resetDemo:()=>Promise<void>};
const Context=createContext<Auth|null>(null);
export function AuthProvider({children,onSessionRedirect}:{children:React.ReactNode;onSessionRedirect?:()=>void}){const [user,setUser]=useState<User|null>(null);const [ready,setReady]=useState(false);const query=useQueryClient();const expiring=useRef(false);const initialSession=useRef<Promise<User|null>|null>(null);
 useEffect(()=>{let live=true;initialSession.current??=api.getMe();initialSession.current.then(u=>{if(live)setUser(u);}).catch(()=>{if(live)setUser(null);}).finally(()=>{if(live)setReady(true);});return()=>{live=false;};},[]);
 // A full reload discards in-memory carts and stale client state after expiry.
 // eslint-disable-next-line @next/next/no-location-assign-relative-destination
 useEffect(()=>onSessionExpired(()=>{if(expiring.current)return;expiring.current=true;setUser(null);void query.cancelQueries();query.clear();if(dataMode==="mock")void api.logout();if(onSessionRedirect)onSessionRedirect();else if(typeof window!=="undefined")window.location.assign("/login?reason=session_expired");}),[query,onSessionRedirect]);
 async function login(username:string,password:string){const u=await api.login(username,password);query.clear();expiring.current=false;setUser(u);}
 async function logout(){await api.logout();await query.cancelQueries();query.clear();setUser(null);}
 async function resetDemo(){if(dataMode!=="mock")throw new Error("Demo reset is unavailable.");await query.cancelQueries();resetDemoData();query.clear();setUser(null);}
 return <Context.Provider value={{user,ready,login,logout,resetDemo}}>{children}</Context.Provider>;}
export function useAuth(){const value=useContext(Context);if(!value)throw new Error("AuthProvider missing");return value;}
