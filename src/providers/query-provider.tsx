"use client";
import { QueryClient,QueryClientProvider,QueryCache,MutationCache } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ApiError } from "@/types/api";
import { notifySessionExpired } from "@/services/api/session";
import { hydrateReferenceQueries, isOfflineOrNetworkError, REFERENCE_GC_TIME_MS } from "@/services/offline/posReferenceCache";
const onError=(error:Error)=>{if(error instanceof ApiError&&error.status===401)notifySessionExpired();};
export function QueryProvider({children}:{children:React.ReactNode}){const [client]=useState(()=>new QueryClient({queryCache:new QueryCache({onError}),mutationCache:new MutationCache({onError}),defaultOptions:{queries:{gcTime:REFERENCE_GC_TIME_MS,retry:(count,error)=>!(error instanceof ApiError&&error.status===401)&&!isOfflineOrNetworkError(error)&&count<2}}}));useEffect(()=>{void hydrateReferenceQueries(client);},[client]);return <QueryClientProvider client={client}>{children}</QueryClientProvider>;}
