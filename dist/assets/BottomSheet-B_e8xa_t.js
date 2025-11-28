import{r as a,_ as c,j as e,X as n}from"./index-D1C6o8KR.js";const u=({isOpen:t,onClose:s,children:l,title:o})=>{const[i,r]=a.useState(!1);return a.useEffect(()=>{if(t)r(!0),document.body.style.overflow="hidden";else{const d=setTimeout(()=>r(!1),300);return document.body.style.overflow="",()=>clearTimeout(d)}},[t]),!i&&!t?null:c.createPortal(e.jsxs("div",{className:"fixed inset-0 z-50 flex items-end justify-center sm:items-center",children:[e.jsx("div",{className:`
          absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300
          ${t?"opacity-100":"opacity-0"}
        `,onClick:s}),e.jsxs("div",{className:`
          relative w-full max-w-lg bg-white dark:bg-gray-900 
          rounded-t-2xl sm:rounded-2xl shadow-xl 
          transform transition-transform duration-300 ease-out
          max-h-[90vh] flex flex-col
          ${t?"translate-y-0 scale-100":"translate-y-full sm:translate-y-10 sm:scale-95"}
        `,children:[e.jsx("div",{className:"w-full flex justify-center pt-3 pb-1 sm:hidden",onClick:s,children:e.jsx("div",{className:"w-12 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full"})}),e.jsxs("div",{className:"flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800",children:[e.jsx("h3",{className:"text-lg font-semibold text-gray-900 dark:text-white",children:o||"Menu"}),e.jsx("button",{onClick:s,className:"p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors",children:e.jsx(n,{className:"w-6 h-6 text-gray-500"})})]}),e.jsx("div",{className:"overflow-y-auto p-4",children:l})]})]}),document.body)};export{u as B};
