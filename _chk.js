process.env.NODE_ENV='development';
const babel=require('@babel/core');
const files=['src/pages/Quotations.js','src/pages/PriceTiers.js','src/pages/CreditAccounts.js','src/pages/SerialTracking.js','src/pages/Warranties.js','src/pages/Excise.js','src/pages/BulkUnits.js','src/App.js','src/components/Sidebar.js','src/pages/Products.js','src/api/retailApi.js'];
let ok=true;
for(const f of files){ try{ babel.transformFileSync(f,{presets:[require.resolve('babel-preset-react-app')]}); console.log('OK   '+f);}catch(e){ok=false; console.log('FAIL '+f+'  '+e.message.split('\n')[0]);} }
process.exit(ok?0:1);
