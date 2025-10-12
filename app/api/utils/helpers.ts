export function parseFechaHora(fecha: string, hora: string): Date {
	const [day, month, year] = fecha.split("/").map(Number);
	const [hours, minutes] = hora.split(":").map(Number);
	return new Date(year, month - 1, day, hours, minutes);
}

export function cleanExam<T extends { type: string; rut: string; nombre: string; edad: string; sexo: string }>(exam: T): T {
	const requiredKeys = ["type", "rut", "nombre", "edad", "sexo"];
	return Object.fromEntries(
		Object.entries(exam)
			.filter(([key, value]) => {
				// always keep required keys
				if (requiredKeys.includes(key)) return true;
				// keep optional keys only if not empty
				return value !== "" && value !== null && value !== undefined;
			})
	) as T;
}

export function calculateVFG(crea: number, edad: number, sexo: string): string {
	let vfg = "";
	if (sexo == "FEMENINO" ) {
		if (crea <= 0.7) {
		vfg = Math.round(143.704 * Math.pow(crea/0.7, -0.241) * Math.pow(0.9938, edad)).toString();
		} else {
		vfg = Math.round(143.704 * Math.pow(crea/0.7, -1.2) * Math.pow(0.9938, edad)).toString();
		}
	} else if (sexo == "MASCULINO") {
		if (crea <= 0.9) {
		vfg = Math.round(142 * Math.pow(crea/0.9, -0.302) * Math.pow(0.9938, edad)).toString();
		} else {
		vfg = Math.round(142 * Math.pow(crea/0.9, -1.2) * Math.pow(0.9938, edad)).toString();
		}
	}
	return vfg;
}