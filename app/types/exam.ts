export type OrinaExam = {
  type: string;
  rut: string;
  nombre: string;
  edad: string;
  sexo: string;
  ph: number;
  densidad: number;
  [key: string]: string | number | undefined;
};

export type CultivoExam = {
  type: string;
  rut: string;
  nombre: string;
  edad: string;
  sexo: string;
  fecha?: string;
  hora?: string;
};

export type GeneralExam = {
  type: string;
  rut: string;
  nombre: string;
  edad: string;
  sexo: string;
  fecha?: string;
  hora?: string;
  [key: string]: string | number | undefined;
};

export type Exam = OrinaExam | CultivoExam | GeneralExam;
