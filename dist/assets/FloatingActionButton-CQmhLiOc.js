import{j as e,P as m}from"./index-D1C6o8KR.js";const b=({children:l,icon:n,label:r,position:s="bottom-right",offset:t,size:i,className:a="",...g})=>{const c={"bottom-right":"bottom-20 right-4 lg:bottom-8 lg:right-8","bottom-left":"bottom-20 left-4 lg:bottom-8 lg:left-8","bottom-center":"bottom-20 left-1/2 -translate-x-1/2 lg:bottom-8"},o={};return t&&(t.bottom!==void 0&&(o.bottom=`${t.bottom}px`),t.right!==void 0&&(o.right=`${t.right}px`),t.left!==void 0&&(o.left=`${t.left}px`)),i&&(o.width=`${i}px`,o.height=`${i}px`),e.jsxs("button",{className:`
        fixed z-40 flex items-center justify-center
        rounded-full shadow-lg
        bg-sky-600 hover:bg-sky-700 active:bg-sky-800
        dark:bg-purple-600 dark:hover:bg-purple-700 dark:active:bg-purple-800
        text-white transition-all duration-200
        hover:scale-110 active:scale-95
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 dark:focus:ring-purple-500
        ${t?"fixed":c[s]}
        ${i?"":"w-14 h-14"}
        ${a}
      `,style:o,...g,"aria-label":r||"Floating Action Button",children:[l||n||e.jsx(m,{className:"w-6 h-6"}),r&&e.jsx("span",{className:"sr-only",children:r})]})};export{b as F};
