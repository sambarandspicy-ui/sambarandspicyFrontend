"use client";
import { QueryClient,QueryClientProvider,QueryCache,MutationCache } from "@tanstack/react-query";
import { useState } from "react";
import { ApiError } from "@/types/api";
import { notifySessionExpired } from "@/services/api/session";
const onError=(error:Error)=>{if(error instanceof ApiError&&error.status===401)notifySessionExpired();};
export function QueryProvider({children}:{children:React.ReactNode}){const [client]=useState(()=>new QueryClient({queryCache:new QueryCache({onError}),mutationCache:new MutationCache({onError}),defaultOptions:{queries:{retry:(count,error)=>!(error instanceof ApiError&&error.status===401)&&count<2}}}));return <QueryClientProvider client={client}>{children}</QueryClientProvider>;}
