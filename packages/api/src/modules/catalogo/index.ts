import { Module } from "@medusajs/framework/utils"
import CatalogoModuleService from "./service"

export const CATALOGO_MODULE = "catalogo"

export default Module(CATALOGO_MODULE, { service: CatalogoModuleService })
