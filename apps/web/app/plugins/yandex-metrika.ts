export default defineNuxtPlugin({
  name: "yandex-metrika",
  dependsOn: ["site-gate"],
  setup() {
    const isDev = import.meta.dev;
    const devEnabled = useRuntimeConfig().public.metrikaDev === true;
    if (isDev && !devEnabled) return;

    const gate = useSiteGate();
    const config = gate.value?.analytics?.yandexMetrika;
    const counterId = config?.counterId;
    if (!counterId) return;
    if (gate.value?.status !== "active") return;

    if (isDev) {
      console.info(
        `[metrika] dev mode: counter ${counterId} loaded. Запросы пойдут на mc.yandex.ru — добавьте домен localhost в кабинете Метрики или используйте ?_ym_debug=1.`,
      );
    }

    const initOptions: Record<string, boolean> = {};
    if (config?.webvisor) initOptions.webvisor = true;
    if (config?.clickmap) initOptions.clickmap = true;
    if (config?.trackLinks) initOptions.trackLinks = true;
    if (config?.accurateTrackBounce) initOptions.accurateTrackBounce = true;
    if (config?.ecommerce) initOptions.ecommerce = "dataLayer" as unknown as boolean;

    const initJson = JSON.stringify(initOptions);

    useHead({
      script: [
        {
          tagPosition: "head",
          innerHTML: `(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};m[i].l=1*new Date();for(var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r){return;}}k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})(window,document,"script","https://mc.yandex.ru/metrika/tag.js","ym");ym(${counterId},"init",${initJson});`,
        },
      ],
      noscript: [
        {
          innerHTML: `<div><img src="https://mc.yandex.ru/watch/${counterId}" style="position:absolute;left:-9999px;" alt="" /></div>`,
        },
      ],
    });

    if (import.meta.client) {
      const router = useRouter();
      router.afterEach((to, from) => {
        if (to.fullPath === from.fullPath) return;
        if (typeof window === "undefined" || typeof window.ym !== "function") return;
        window.ym(counterId, "hit", to.fullPath, {
          title: typeof document !== "undefined" ? document.title : undefined,
          referer: from.fullPath,
        });
      });
    }
  },
});
