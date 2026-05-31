import { application } from "controllers/application"
import NavController from "controllers/nav_controller"
import LogoController from "controllers/logo_controller"

application.register("nav", NavController)
application.register("logo", LogoController)
