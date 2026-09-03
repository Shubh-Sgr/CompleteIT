import {PrismaClient} from "@prisma/client";
import {addGenericData} from "./generic-data.js";

const prisma=new PrismaClient();
addGenericData(prisma).then(()=>console.log("Added category-neutral goals and diverse demo data without resetting existing records.")).finally(()=>prisma.$disconnect());
