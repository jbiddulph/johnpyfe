import{d as o,g as t}from"./nitro/netlify.mjs";import{PrismaClient as e}from"@prisma/client";import"node:http";import"node:https";import"node:fs";import"node:path";import"vue";import"consola/core";const n=new e,r=o((o=>{const{town:e}=t(o),r={town:{equals:e,mode:"insensitive"}};return n.venue.findMany({where:r})}));export{r as default};
//# sourceMappingURL=index.get6.mjs.map
