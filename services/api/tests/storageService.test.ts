import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";

describe("Backblaze native storage",()=>{
  const original={...process.env};

  beforeEach(()=>{
    vi.resetModules();
    process.env={...original,DATABASE_URL:"postgresql://user:pass@localhost:5432/test",MINIO_ENDPOINT:"https://s3.us-east-005.backblazeb2.com",MINIO_ACCESS_KEY:"key-id",MINIO_SECRET_KEY:"application-key",MINIO_BUCKET:"completeit-test"};
  });

  afterEach(()=>{process.env=original;vi.restoreAllMocks()});

  it("uploads exact bytes with the native API and downloads by object name",async()=>{
    const uploaded=Buffer.from([1,2,3,4]);
    const downloaded=Buffer.from([5,6,7]);
    const fetchMock=vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({authorizationToken:"account-token",apiInfo:{storageApi:{apiUrl:"https://api.example.test",downloadUrl:"https://download.example.test",allowed:{buckets:[{id:"bucket-id",name:"completeit-test"}]}}}}),{status:200}))
      .mockResolvedValueOnce(new Response(JSON.stringify({uploadUrl:"https://upload.example.test/file",authorizationToken:"upload-token"}),{status:200}))
      .mockResolvedValueOnce(new Response(JSON.stringify({fileId:"file-id"}),{status:200}))
      .mockResolvedValueOnce(new Response(downloaded,{status:200}));
    vi.stubGlobal("fetch",fetchMock);

    const {readObject,storeObject}=await import("../src/services/storageService.js");
    await storeObject("uploads/guest/my image.jpg",uploaded,"image/jpeg");
    await expect(readObject("uploads/guest/my image.jpg")).resolves.toEqual(downloaded);

    expect(fetchMock).toHaveBeenCalledTimes(4);
    const uploadRequest=fetchMock.mock.calls[2] as [string,RequestInit];
    expect(uploadRequest[0]).toBe("https://upload.example.test/file");
    expect(uploadRequest[1].headers).toMatchObject({"content-length":"4","content-type":"image/jpeg","x-bz-file-name":"uploads/guest/my%20image.jpg"});
    expect(Buffer.from(uploadRequest[1].body as ArrayBuffer)).toEqual(uploaded);
    expect(fetchMock.mock.calls[3]?.[0]).toBe("https://download.example.test/file/completeit-test/uploads/guest/my%20image.jpg");
  });
});
