import { createEmptyDraft, type DocumentDraft } from '../../domain/documents'

/**
 * 示例报价单（完全虚构，仅用于演示单据生成流程）。
 * 名称、邮箱、电话、税号均带「示例」标识，避免与真实企业混淆。
 */
export function createSampleQuotationDraft(): DocumentDraft {
  const base = createEmptyDraft('QT')
  return {
    ...base,
    documentNumber: 'QT-20260830-001',
    issueDate: '2026-08-30',
    seller: {
      companyName: '鸿运家居用品（示例）有限公司',
      address: '广东省佛山市顺德区示例大道 18 号',
      contact: '李示例',
      phone: '0757-8888 6666',
      email: 'sales@example-demo.com',
      taxId: '91440606EXAMPLE0001',
      country: '中国',
    },
    buyer: {
      companyName: 'Sunrise Trading Co., Ltd.（示例）',
      address: 'No. 12 Example Road, Los Angeles, CA, USA',
      contact: 'John Demo',
      phone: '+1-310-555-0142',
      email: 'purchase@example-demo.com',
      taxId: 'US-EIN-00-0000000',
      country: '美国',
    },
    items: [
      {
        id: 'sample-item-1',
        name: '折叠户外露营椅',
        specification: '铝合金框架 / 600D 牛津布 / 承重 120kg',
        quantity: 500,
        unit: '把',
        unitPrice: 12.5,
        cartons: 50,
        netWeight: 4.2,
        grossWeight: 5.0,
        volume: 0.04,
        hsCode: '940179',
        declarationElements: '用途：户外休闲；材质：铝合金 + 牛津布',
      },
    ],
    trade: {
      country: '美国',
      incoterm: 'FOB 深圳',
      paymentTerm: '30% 定金，出货前付清 70%',
      currency: '美元',
      deliveryTime: '收到定金后 25 天',
      portOfLoading: '深圳',
      portOfDestination: '洛杉矶',
      validity: '报价有效期 15 天',
    },
    settlement: {
      bankName: '示例银行深圳分行',
      accountName: '鸿运家居用品（示例）有限公司',
      accountNumber: '6225 8801 0000 0000',
      bankAddress: '深圳市福田区示例路 1 号',
      swift: 'EXMPUS33XXX',
      transportMode: '海运',
      customsPort: '深圳海关',
      marks: '无唛头',
    },
    notes: '示例数据，仅用于演示单据生成流程，发送前请替换为真实信息。',
    language: 'zh',
    layout: 'modern',
    updatedAt: new Date().toISOString(),
    reviewFields: [],
    logo: '',
  }
}
