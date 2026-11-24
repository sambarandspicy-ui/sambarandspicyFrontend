"use client";
import { createContext,useContext,useEffect,useSyncExternalStore } from "react";
type Theme="light"|"dark";
const key="sambar-spicy-theme";
function subscribe(cb:()=>void){window.addEventListener("storage",cb);window.addEventListener("theme-change",cb);return()=>{window.removeEventListener("storage",cb);window.removeEventListener("theme-change",cb);};}
function getTheme():Theme{try{return localStorage.getItem(key)==="dark"?"dark":"light";}catch{return "light";}}
const Context=createContext<{theme:Theme;toggle:()=>void}>({theme:"light",toggle:()=>{}});
export function ThemeProvider({children}:{children:React.ReactNode}){const theme=useSyncExternalStore(subscribe,getTheme,()=>"light" as Theme);useEffect(()=>{document.documentElement.classList.toggle("dark",theme==="dark");},[theme]);function toggle(){const next=getTheme()==="dark"?"light":"dark";try{localStorage.setItem(key,next);}catch{}document.documentElement.classList.toggle("dark",next==="dark");window.dispatchEvent(new Event("theme-change"));}return <Context.Provider value={{theme,toggle}}>{children}</Context.Provider>;}
export function useTheme(){return useContext(Context);}
