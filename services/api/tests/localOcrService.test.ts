import {describe,expect,it} from "vitest";
import {rowsToObjects} from "../src/services/localOcrService.js";

describe("portable OCR grouping",()=>{
  it("keeps adjacent product packages as separate items",()=>{
    const rows=[
      {text:"ROASTED",confidence:1,x:.143,y:.585,width:.14,height:.043},{text:"ALMONDS",confidence:1,x:.143,y:.55,width:.144,height:.042},{text:"SAFFRON INFUSED",confidence:1,x:.165,y:.534,width:.085,height:.015},
      {text:"ROASTED",confidence:1,x:.299,y:.597,width:.14,height:.043},{text:"CASHEWS",confidence:1,x:.299,y:.567,width:.14,height:.037},{text:"Cashews Turn",confidence:1,x:.32,y:.521,width:.088,height:.015},
      {text:"MILLETS & CHANA",confidence:1,x:.512,y:.748,width:.191,height:.052},{text:"When Millets Met Chana",confidence:1,x:.529,y:.708,width:.147,height:.038},
      {text:"ALMOND",confidence:1,x:.212,y:.257,width:.137,height:.032},{text:"BRITTLE",confidence:1,x:.242,y:.239,width:.107,height:.035},
      {text:"DIET",confidence:1,x:.695,y:.329,width:.049,height:.021},{text:"CHIVDA",confidence:1,x:.677,y:.303,width:.081,height:.035}
    ];
    const labels=rowsToObjects(rows).map(value=>value.label);
    expect(labels.some(label=>/ROASTED.*ALMONDS|ALMONDS.*ROASTED/i.test(label))).toBe(true);
    expect(labels.some(label=>/ROASTED.*CASHEWS|CASHEWS.*ROASTED/i.test(label))).toBe(true);
    expect(labels.some(label=>/MILLETS.*CHANA/i.test(label))).toBe(true);
    expect(labels.some(label=>/ALMOND.*BRITTLE|BRITTLE.*ALMOND/i.test(label))).toBe(true);
    expect(labels.some(label=>/DIET.*CHIVDA|CHIVDA.*DIET/i.test(label))).toBe(true);
    expect(labels.length).toBeGreaterThanOrEqual(5);
  });
});
