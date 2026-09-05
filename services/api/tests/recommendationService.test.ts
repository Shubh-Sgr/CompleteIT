import {describe,expect,it} from "vitest";
import {likelySameItem} from "../src/services/recommendationService.js";

describe("recommendation item deduplication",()=>{
  it("keeps sibling products distinct while matching a shortened exact item",()=>{
    expect(likelySameItem("Roasted Almonds bottle","Roasted Cashews bottle")).toBe(false);
    expect(likelySameItem("Roasted Cashews bottle","Roasted Cashews")).toBe(true);
  });
});
