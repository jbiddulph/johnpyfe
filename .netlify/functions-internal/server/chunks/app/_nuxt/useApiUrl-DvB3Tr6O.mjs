import{a as r}from"../server.mjs";function useApiUrl(t){const a=r();return`${(a.public.apiURL||a.public.appURL||a.public.baseURL||"").toString().replace(/\/$/,"")}${t.startsWith("/")?t:`/${t}`}`}function getRouteParam(r){return Array.isArray(r)?r[0]:String(null!=r?r:"")}export{getRouteParam as g,useApiUrl as u};
//# sourceMappingURL=useApiUrl-DvB3Tr6O.mjs.map
