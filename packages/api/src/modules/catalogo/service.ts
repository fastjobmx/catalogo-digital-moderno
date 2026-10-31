import { MedusaService } from "@medusajs/framework/utils"
import CatalogImport from "./models/catalog-import"
import OrderRequest from "./models/order-request"
import OrderRequestItem from "./models/order-request-item"
import VendorProfile from "./models/vendor-profile"
import WhatsappMessage from "./models/whatsapp-message"
import WhatsappOutbox from "./models/whatsapp-outbox"

class CatalogoModuleService extends MedusaService({
  VendorProfile,
  CatalogImport,
  OrderRequest,
  OrderRequestItem,
  WhatsappMessage,
  WhatsappOutbox,
}) {}

export default CatalogoModuleService
