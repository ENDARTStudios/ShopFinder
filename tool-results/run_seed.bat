@echo off
REM T016 — Seed runner .bat (Windows native)
cd /d D:\PROJETOS\ShopFinder\ShopFinder
echo === T016: Seed with Evidence > ..\..\seed-output.log
echo Started: %DATE% %TIME% >> ..\..\seed-output.log

REM Set DATABASE_URL from .env
for /f "tokens=2 delims==" %%a in ('type .env ^| find "DATABASE_URL="') do set DATABASE_URL=%%a

echo User: postgres >> ..\..\seed-output.log
echo Host check:
echo %DATABASE_URL% | find "-pooler" >nul && echo Neon pooler: YES >> ..\..\seed-output.log || echo Neon pooler: NO >> ..\..\seed-output.log

echo. >> ..\..\seed-output.log
echo --- Step 1: Bun Seed --- >> ..\..\seed-output.log
bun run scripts/seed-catalog.ts >> ..\..\seed-output.log 2>&1
echo SEED_EXIT=%errorlevel% >> ..\..\seed-output.log

echo. >> ..\..\seed-output.log
echo --- Step 2: Verification --- >> ..\..\seed-output.log
node -e "const{PrismaClient}=require('@prisma/client');const p=new PrismaClient();(async()=>{console.log('STORE_COUNT='+await p.store.count());console.log('TOTAL='+await p.product.count());console.log('PUBLISHED='+await p.product.count({where:{status:'published'}}));const s=await p.product.findMany({where:{status:'published'},select:{slug:true},take:5});console.log('SLUGS='+s.map(x=>x.slug).join(','));await p.$disconnect()})().catch(e=>{console.log('ERR:'+e.message);process.exit(1)})" >> ..\..\seed-output.log 2>&1
echo VERIFY_EXIT=%errorlevel% >> ..\..\seed-output.log

echo === DONE === >> ..\..\seed-output.log
echo Output saved to seed-output.log