#define ICALL_TABLE_corlib 1

static int corlib_icall_indexes [] = {
181,
190,
191,
192,
193,
194,
195,
196,
197,
200,
201,
260,
261,
262,
286,
287,
288,
298,
299,
300,
301,
389,
390,
391,
394,
425,
426,
428,
430,
432,
434,
439,
447,
448,
449,
450,
451,
452,
453,
454,
455,
456,
457,
458,
540,
541,
593,
599,
602,
604,
609,
610,
612,
613,
617,
618,
620,
622,
623,
626,
627,
628,
631,
634,
636,
638,
647,
702,
704,
706,
716,
717,
718,
720,
726,
727,
728,
729,
730,
738,
739,
740,
744,
745,
747,
749,
941,
1089,
1090,
6471,
6472,
6474,
6475,
6476,
6477,
6478,
6480,
6482,
6484,
6494,
6496,
6501,
6503,
6505,
6507,
6558,
6559,
6561,
6562,
6563,
6564,
6565,
6567,
6569,
7437,
7441,
7443,
7444,
7445,
7446,
7655,
7656,
7657,
7658,
7674,
7675,
7676,
7678,
7718,
7785,
7787,
7796,
7797,
7798,
7799,
8179,
8183,
8184,
8210,
8227,
8234,
8241,
8252,
8255,
8275,
8346,
8348,
8357,
8359,
8360,
8367,
8381,
8401,
8402,
8410,
8412,
8419,
8420,
8423,
8425,
8430,
8436,
8437,
8444,
8446,
8458,
8461,
8462,
8463,
8474,
8483,
8489,
8490,
8491,
8493,
8494,
8511,
8513,
8527,
8544,
8571,
8601,
8602,
9025,
9108,
9109,
9253,
9254,
9258,
9261,
9326,
9681,
9682,
9893,
9903,
10543,
10564,
10566,
10568,
};
void ves_icall_System_Array_InternalCreate (int,int,int,int,int);
int ves_icall_System_Array_GetCorElementTypeOfElementTypeInternal (int);
int ves_icall_System_Array_CanChangePrimitive (int,int,int);
int ves_icall_System_Array_FastCopy (int,int,int,int,int);
int ves_icall_System_Array_GetLengthInternal_raw (int,int,int);
int ves_icall_System_Array_GetLowerBoundInternal_raw (int,int,int);
void ves_icall_System_Array_GetGenericValue_icall (int,int,int);
void ves_icall_System_Array_GetValueImpl_raw (int,int,int,int);
void ves_icall_System_Array_SetGenericValue_icall (int,int,int);
void ves_icall_System_Array_SetValueImpl_raw (int,int,int,int);
void ves_icall_System_Array_SetValueRelaxedImpl_raw (int,int,int,int);
void ves_icall_System_Runtime_RuntimeImports_ZeroMemory (int,int);
void ves_icall_System_Runtime_RuntimeImports_Memmove (int,int,int);
void ves_icall_System_Buffer_BulkMoveWithWriteBarrier (int,int,int,int);
int ves_icall_System_Delegate_AllocDelegateLike_internal_raw (int,int);
int ves_icall_System_Delegate_CreateDelegate_internal_raw (int,int,int,int,int);
int ves_icall_System_Delegate_GetVirtualMethod_internal_raw (int,int);
void ves_icall_System_Enum_GetEnumValuesAndNames_raw (int,int,int,int);
void ves_icall_System_Enum_InternalBoxEnum_raw (int,int,int64_t,int);
int ves_icall_System_Enum_InternalGetCorElementType (int);
void ves_icall_System_Enum_InternalGetUnderlyingType_raw (int,int,int);
int ves_icall_System_Environment_get_ProcessorCount ();
int ves_icall_System_Environment_get_TickCount ();
int64_t ves_icall_System_Environment_get_TickCount64 ();
void ves_icall_System_Environment_FailFast_raw (int,int,int,int);
void ves_icall_System_GC_register_ephemeron_array_raw (int,int);
int ves_icall_System_GC_get_ephemeron_tombstone_raw (int);
void ves_icall_System_GC_SuppressFinalize_raw (int,int);
void ves_icall_System_GC_ReRegisterForFinalize_raw (int,int);
void ves_icall_System_GC_GetGCMemoryInfo (int,int,int,int,int,int);
int ves_icall_System_GC_AllocPinnedArray_raw (int,int,int);
int ves_icall_System_Object_MemberwiseClone_raw (int,int);
double ves_icall_System_Math_Acos (double);
double ves_icall_System_Math_Atan2 (double,double);
double ves_icall_System_Math_Ceiling (double);
double ves_icall_System_Math_Cos (double);
double ves_icall_System_Math_Floor (double);
double ves_icall_System_Math_Log (double);
double ves_icall_System_Math_Log10 (double);
double ves_icall_System_Math_Pow (double,double);
double ves_icall_System_Math_Sin (double);
double ves_icall_System_Math_Sqrt (double);
double ves_icall_System_Math_Tan (double);
double ves_icall_System_Math_ModF (double,int);
void ves_icall_RuntimeMethodHandle_ReboxFromNullable_raw (int,int,int);
void ves_icall_RuntimeMethodHandle_ReboxToNullable_raw (int,int,int,int);
int ves_icall_RuntimeType_GetCorrespondingInflatedMethod_raw (int,int,int);
void ves_icall_RuntimeType_make_array_type_raw (int,int,int,int);
void ves_icall_RuntimeType_make_byref_type_raw (int,int,int);
void ves_icall_RuntimeType_make_pointer_type_raw (int,int,int);
void ves_icall_RuntimeType_MakeGenericType_raw (int,int,int,int);
int ves_icall_RuntimeType_GetMethodsByName_native_raw (int,int,int,int,int);
int ves_icall_RuntimeType_GetPropertiesByName_native_raw (int,int,int,int,int);
int ves_icall_RuntimeType_GetConstructors_native_raw (int,int,int);
int ves_icall_System_RuntimeType_CreateInstanceInternal_raw (int,int);
void ves_icall_System_RuntimeType_AllocateValueType_raw (int,int,int,int);
void ves_icall_RuntimeType_GetDeclaringMethod_raw (int,int,int);
void ves_icall_System_RuntimeType_getFullName_raw (int,int,int,int,int);
void ves_icall_RuntimeType_GetGenericArgumentsInternal_raw (int,int,int,int);
int ves_icall_RuntimeType_GetGenericParameterPosition (int);
int ves_icall_RuntimeType_GetEvents_native_raw (int,int,int,int);
int ves_icall_RuntimeType_GetFields_native_raw (int,int,int,int,int);
void ves_icall_RuntimeType_GetInterfaces_raw (int,int,int);
void ves_icall_RuntimeType_GetDeclaringType_raw (int,int,int);
void ves_icall_RuntimeType_GetName_raw (int,int,int);
void ves_icall_RuntimeType_GetNamespace_raw (int,int,int);
int ves_icall_RuntimeType_FunctionPointerReturnAndParameterTypes_raw (int,int);
int ves_icall_RuntimeTypeHandle_GetAttributes (int);
int ves_icall_RuntimeTypeHandle_GetMetadataToken_raw (int,int);
void ves_icall_RuntimeTypeHandle_GetGenericTypeDefinition_impl_raw (int,int,int);
int ves_icall_RuntimeTypeHandle_GetCorElementType (int);
int ves_icall_RuntimeTypeHandle_HasInstantiation (int);
int ves_icall_RuntimeTypeHandle_IsInstanceOfType_raw (int,int,int);
int ves_icall_RuntimeTypeHandle_HasReferences_raw (int,int);
int ves_icall_RuntimeTypeHandle_GetArrayRank_raw (int,int);
void ves_icall_RuntimeTypeHandle_GetAssembly_raw (int,int,int);
void ves_icall_RuntimeTypeHandle_GetElementType_raw (int,int,int);
void ves_icall_RuntimeTypeHandle_GetModule_raw (int,int,int);
void ves_icall_RuntimeTypeHandle_GetBaseType_raw (int,int,int);
int ves_icall_RuntimeTypeHandle_type_is_assignable_from_raw (int,int,int);
int ves_icall_RuntimeTypeHandle_IsGenericTypeDefinition (int);
int ves_icall_RuntimeTypeHandle_GetGenericParameterInfo_raw (int,int);
int ves_icall_RuntimeTypeHandle_is_subclass_of_raw (int,int,int);
int ves_icall_RuntimeTypeHandle_IsByRefLike_raw (int,int);
void ves_icall_System_RuntimeTypeHandle_internal_from_name_raw (int,int,int,int,int,int);
int ves_icall_System_String_FastAllocateString_raw (int,int);
int ves_icall_System_Type_internal_from_handle_raw (int,int);
int ves_icall_System_ValueType_InternalGetHashCode_raw (int,int,int);
int ves_icall_System_ValueType_Equals_raw (int,int,int,int);
int ves_icall_System_Threading_Interlocked_CompareExchange_Int (int,int,int);
void ves_icall_System_Threading_Interlocked_CompareExchange_Object (int,int,int,int);
int ves_icall_System_Threading_Interlocked_Decrement_Int (int);
int ves_icall_System_Threading_Interlocked_Increment_Int (int);
int64_t ves_icall_System_Threading_Interlocked_Increment_Long (int);
int ves_icall_System_Threading_Interlocked_Exchange_Int (int,int);
void ves_icall_System_Threading_Interlocked_Exchange_Object (int,int,int);
int64_t ves_icall_System_Threading_Interlocked_CompareExchange_Long (int,int64_t,int64_t);
int64_t ves_icall_System_Threading_Interlocked_Exchange_Long (int,int64_t);
int ves_icall_System_Threading_Interlocked_Add_Int (int,int);
void ves_icall_System_Threading_Monitor_Monitor_Enter_raw (int,int);
void mono_monitor_exit_icall_raw (int,int);
void ves_icall_System_Threading_Monitor_Monitor_pulse_raw (int,int);
void ves_icall_System_Threading_Monitor_Monitor_pulse_all_raw (int,int);
int ves_icall_System_Threading_Monitor_Monitor_wait_raw (int,int,int,int);
void ves_icall_System_Threading_Monitor_Monitor_try_enter_with_atomic_var_raw (int,int,int,int,int);
void ves_icall_System_Threading_Thread_InitInternal_raw (int,int);
int ves_icall_System_Threading_Thread_GetCurrentThread ();
void ves_icall_System_Threading_InternalThread_Thread_free_internal_raw (int,int);
int ves_icall_System_Threading_Thread_GetState_raw (int,int);
void ves_icall_System_Threading_Thread_SetState_raw (int,int,int);
void ves_icall_System_Threading_Thread_ClrState_raw (int,int,int);
void ves_icall_System_Threading_Thread_SetName_icall_raw (int,int,int,int);
int ves_icall_System_Threading_Thread_YieldInternal ();
void ves_icall_System_Threading_Thread_SetPriority_raw (int,int,int);
void ves_icall_System_Runtime_Loader_AssemblyLoadContext_PrepareForAssemblyLoadContextRelease_raw (int,int,int);
int ves_icall_System_Runtime_Loader_AssemblyLoadContext_GetLoadContextForAssembly_raw (int,int);
int ves_icall_System_Runtime_Loader_AssemblyLoadContext_InternalLoadFile_raw (int,int,int,int);
int ves_icall_System_Runtime_Loader_AssemblyLoadContext_InternalInitializeNativeALC_raw (int,int,int,int,int);
int ves_icall_System_Runtime_Loader_AssemblyLoadContext_InternalLoadFromStream_raw (int,int,int,int,int,int);
int ves_icall_System_Runtime_Loader_AssemblyLoadContext_InternalGetLoadedAssemblies_raw (int);
int ves_icall_System_GCHandle_InternalAlloc_raw (int,int,int);
void ves_icall_System_GCHandle_InternalFree_raw (int,int);
int ves_icall_System_GCHandle_InternalGet_raw (int,int);
void ves_icall_System_GCHandle_InternalSet_raw (int,int,int);
int ves_icall_System_Runtime_InteropServices_Marshal_GetLastPInvokeError ();
void ves_icall_System_Runtime_InteropServices_Marshal_SetLastPInvokeError (int);
void ves_icall_System_Runtime_InteropServices_Marshal_StructureToPtr_raw (int,int,int,int);
int ves_icall_System_Runtime_InteropServices_Marshal_SizeOfHelper_raw (int,int,int);
int ves_icall_System_Runtime_InteropServices_NativeLibrary_LoadByName_raw (int,int,int,int,int,int);
int ves_icall_System_Runtime_CompilerServices_RuntimeHelpers_InternalGetHashCode_raw (int,int);
int ves_icall_System_Runtime_CompilerServices_RuntimeHelpers_InternalTryGetHashCode_raw (int,int);
int ves_icall_System_Runtime_CompilerServices_RuntimeHelpers_GetUninitializedObjectInternal_raw (int,int);
void ves_icall_System_Runtime_CompilerServices_RuntimeHelpers_InitializeArray_raw (int,int,int);
int ves_icall_System_Runtime_CompilerServices_RuntimeHelpers_GetSpanDataFrom_raw (int,int,int,int);
int ves_icall_System_Runtime_CompilerServices_RuntimeHelpers_SufficientExecutionStack ();
int ves_icall_System_Reflection_Assembly_GetEntryAssembly_raw (int);
int ves_icall_System_Reflection_Assembly_InternalLoad_raw (int,int,int,int);
int ves_icall_System_Reflection_Assembly_InternalGetType_raw (int,int,int,int,int,int);
int ves_icall_System_Reflection_AssemblyName_GetNativeName (int);
int ves_icall_MonoCustomAttrs_GetCustomAttributesInternal_raw (int,int,int,int);
int ves_icall_MonoCustomAttrs_GetCustomAttributesDataInternal_raw (int,int);
int ves_icall_MonoCustomAttrs_IsDefinedInternal_raw (int,int,int);
int ves_icall_System_Reflection_FieldInfo_internal_from_handle_type_raw (int,int,int);
int ves_icall_System_Reflection_FieldInfo_get_marshal_info_raw (int,int);
int ves_icall_System_Reflection_LoaderAllocatorScout_Destroy (int);
void ves_icall_System_Reflection_RuntimeAssembly_GetManifestResourceNames_raw (int,int,int);
void ves_icall_System_Reflection_RuntimeAssembly_GetExportedTypes_raw (int,int,int);
void ves_icall_System_Reflection_RuntimeAssembly_GetInfo_raw (int,int,int,int);
int ves_icall_System_Reflection_RuntimeAssembly_GetManifestResourceInternal_raw (int,int,int,int,int);
void ves_icall_System_Reflection_Assembly_GetManifestModuleInternal_raw (int,int,int);
void ves_icall_System_Reflection_RuntimeCustomAttributeData_ResolveArgumentsInternal_raw (int,int,int,int,int,int,int);
void ves_icall_RuntimeEventInfo_get_event_info_raw (int,int,int);
int ves_icall_reflection_get_token_raw (int,int);
int ves_icall_System_Reflection_EventInfo_internal_from_handle_type_raw (int,int,int);
int ves_icall_RuntimeFieldInfo_ResolveType_raw (int,int);
int ves_icall_RuntimeFieldInfo_GetParentType_raw (int,int,int);
int ves_icall_RuntimeFieldInfo_GetFieldOffset_raw (int,int);
int ves_icall_RuntimeFieldInfo_GetValueInternal_raw (int,int,int);
void ves_icall_RuntimeFieldInfo_SetValueInternal_raw (int,int,int,int);
int ves_icall_RuntimeFieldInfo_GetRawConstantValue_raw (int,int);
int ves_icall_reflection_get_token_raw (int,int);
void ves_icall_get_method_info_raw (int,int,int);
int ves_icall_get_method_attributes (int);
int ves_icall_System_Reflection_MonoMethodInfo_get_parameter_info_raw (int,int,int);
int ves_icall_System_MonoMethodInfo_get_retval_marshal_raw (int,int);
int ves_icall_System_Reflection_RuntimeMethodInfo_GetMethodFromHandleInternalType_native_raw (int,int,int,int);
int ves_icall_RuntimeMethodInfo_get_name_raw (int,int);
int ves_icall_RuntimeMethodInfo_get_base_method_raw (int,int,int);
int ves_icall_reflection_get_token_raw (int,int);
int ves_icall_InternalInvoke_raw (int,int,int,int,int);
void ves_icall_RuntimeMethodInfo_GetPInvoke_raw (int,int,int,int,int);
int ves_icall_RuntimeMethodInfo_MakeGenericMethod_impl_raw (int,int,int);
int ves_icall_RuntimeMethodInfo_GetGenericArguments_raw (int,int);
int ves_icall_RuntimeMethodInfo_GetGenericMethodDefinition_raw (int,int);
int ves_icall_RuntimeMethodInfo_get_IsGenericMethodDefinition_raw (int,int);
int ves_icall_RuntimeMethodInfo_get_IsGenericMethod_raw (int,int);
void ves_icall_InvokeClassConstructor_raw (int,int);
int ves_icall_InternalInvoke_raw (int,int,int,int,int);
int ves_icall_reflection_get_token_raw (int,int);
int ves_icall_System_Reflection_RuntimeModule_ResolveMethodToken_raw (int,int,int,int,int,int);
void ves_icall_RuntimePropertyInfo_get_property_info_raw (int,int,int,int);
int ves_icall_reflection_get_token_raw (int,int);
int ves_icall_System_Reflection_RuntimePropertyInfo_internal_from_handle_type_raw (int,int,int);
void ves_icall_DynamicMethod_create_dynamic_method_raw (int,int,int,int,int);
void ves_icall_AssemblyBuilder_basic_init_raw (int,int);
void ves_icall_AssemblyBuilder_UpdateNativeCustomAttributes_raw (int,int);
void ves_icall_ModuleBuilder_basic_init_raw (int,int);
void ves_icall_ModuleBuilder_set_wrappers_type_raw (int,int,int);
int ves_icall_ModuleBuilder_getToken_raw (int,int,int,int);
void ves_icall_ModuleBuilder_RegisterToken_raw (int,int,int,int);
int ves_icall_TypeBuilder_create_runtime_class_raw (int,int);
int ves_icall_System_IO_Stream_HasOverriddenBeginEndRead_raw (int,int);
int ves_icall_System_IO_Stream_HasOverriddenBeginEndWrite_raw (int,int);
int ves_icall_System_Diagnostics_StackFrame_GetFrameInfo (int,int,int,int,int,int,int,int);
void ves_icall_System_Diagnostics_StackTrace_GetTrace (int,int,int,int);
int ves_icall_Mono_RuntimeClassHandle_GetTypeFromClass (int);
void ves_icall_Mono_RuntimeGPtrArrayHandle_GPtrArrayFree (int);
int ves_icall_Mono_SafeStringMarshal_StringToUtf8 (int);
void ves_icall_Mono_SafeStringMarshal_GFree (int);
static void *corlib_icall_funcs [] = {
// token 181,
ves_icall_System_Array_InternalCreate,
// token 190,
ves_icall_System_Array_GetCorElementTypeOfElementTypeInternal,
// token 191,
ves_icall_System_Array_CanChangePrimitive,
// token 192,
ves_icall_System_Array_FastCopy,
// token 193,
ves_icall_System_Array_GetLengthInternal_raw,
// token 194,
ves_icall_System_Array_GetLowerBoundInternal_raw,
// token 195,
ves_icall_System_Array_GetGenericValue_icall,
// token 196,
ves_icall_System_Array_GetValueImpl_raw,
// token 197,
ves_icall_System_Array_SetGenericValue_icall,
// token 200,
ves_icall_System_Array_SetValueImpl_raw,
// token 201,
ves_icall_System_Array_SetValueRelaxedImpl_raw,
// token 260,
ves_icall_System_Runtime_RuntimeImports_ZeroMemory,
// token 261,
ves_icall_System_Runtime_RuntimeImports_Memmove,
// token 262,
ves_icall_System_Buffer_BulkMoveWithWriteBarrier,
// token 286,
ves_icall_System_Delegate_AllocDelegateLike_internal_raw,
// token 287,
ves_icall_System_Delegate_CreateDelegate_internal_raw,
// token 288,
ves_icall_System_Delegate_GetVirtualMethod_internal_raw,
// token 298,
ves_icall_System_Enum_GetEnumValuesAndNames_raw,
// token 299,
ves_icall_System_Enum_InternalBoxEnum_raw,
// token 300,
ves_icall_System_Enum_InternalGetCorElementType,
// token 301,
ves_icall_System_Enum_InternalGetUnderlyingType_raw,
// token 389,
ves_icall_System_Environment_get_ProcessorCount,
// token 390,
ves_icall_System_Environment_get_TickCount,
// token 391,
ves_icall_System_Environment_get_TickCount64,
// token 394,
ves_icall_System_Environment_FailFast_raw,
// token 425,
ves_icall_System_GC_register_ephemeron_array_raw,
// token 426,
ves_icall_System_GC_get_ephemeron_tombstone_raw,
// token 428,
ves_icall_System_GC_SuppressFinalize_raw,
// token 430,
ves_icall_System_GC_ReRegisterForFinalize_raw,
// token 432,
ves_icall_System_GC_GetGCMemoryInfo,
// token 434,
ves_icall_System_GC_AllocPinnedArray_raw,
// token 439,
ves_icall_System_Object_MemberwiseClone_raw,
// token 447,
ves_icall_System_Math_Acos,
// token 448,
ves_icall_System_Math_Atan2,
// token 449,
ves_icall_System_Math_Ceiling,
// token 450,
ves_icall_System_Math_Cos,
// token 451,
ves_icall_System_Math_Floor,
// token 452,
ves_icall_System_Math_Log,
// token 453,
ves_icall_System_Math_Log10,
// token 454,
ves_icall_System_Math_Pow,
// token 455,
ves_icall_System_Math_Sin,
// token 456,
ves_icall_System_Math_Sqrt,
// token 457,
ves_icall_System_Math_Tan,
// token 458,
ves_icall_System_Math_ModF,
// token 540,
ves_icall_RuntimeMethodHandle_ReboxFromNullable_raw,
// token 541,
ves_icall_RuntimeMethodHandle_ReboxToNullable_raw,
// token 593,
ves_icall_RuntimeType_GetCorrespondingInflatedMethod_raw,
// token 599,
ves_icall_RuntimeType_make_array_type_raw,
// token 602,
ves_icall_RuntimeType_make_byref_type_raw,
// token 604,
ves_icall_RuntimeType_make_pointer_type_raw,
// token 609,
ves_icall_RuntimeType_MakeGenericType_raw,
// token 610,
ves_icall_RuntimeType_GetMethodsByName_native_raw,
// token 612,
ves_icall_RuntimeType_GetPropertiesByName_native_raw,
// token 613,
ves_icall_RuntimeType_GetConstructors_native_raw,
// token 617,
ves_icall_System_RuntimeType_CreateInstanceInternal_raw,
// token 618,
ves_icall_System_RuntimeType_AllocateValueType_raw,
// token 620,
ves_icall_RuntimeType_GetDeclaringMethod_raw,
// token 622,
ves_icall_System_RuntimeType_getFullName_raw,
// token 623,
ves_icall_RuntimeType_GetGenericArgumentsInternal_raw,
// token 626,
ves_icall_RuntimeType_GetGenericParameterPosition,
// token 627,
ves_icall_RuntimeType_GetEvents_native_raw,
// token 628,
ves_icall_RuntimeType_GetFields_native_raw,
// token 631,
ves_icall_RuntimeType_GetInterfaces_raw,
// token 634,
ves_icall_RuntimeType_GetDeclaringType_raw,
// token 636,
ves_icall_RuntimeType_GetName_raw,
// token 638,
ves_icall_RuntimeType_GetNamespace_raw,
// token 647,
ves_icall_RuntimeType_FunctionPointerReturnAndParameterTypes_raw,
// token 702,
ves_icall_RuntimeTypeHandle_GetAttributes,
// token 704,
ves_icall_RuntimeTypeHandle_GetMetadataToken_raw,
// token 706,
ves_icall_RuntimeTypeHandle_GetGenericTypeDefinition_impl_raw,
// token 716,
ves_icall_RuntimeTypeHandle_GetCorElementType,
// token 717,
ves_icall_RuntimeTypeHandle_HasInstantiation,
// token 718,
ves_icall_RuntimeTypeHandle_IsInstanceOfType_raw,
// token 720,
ves_icall_RuntimeTypeHandle_HasReferences_raw,
// token 726,
ves_icall_RuntimeTypeHandle_GetArrayRank_raw,
// token 727,
ves_icall_RuntimeTypeHandle_GetAssembly_raw,
// token 728,
ves_icall_RuntimeTypeHandle_GetElementType_raw,
// token 729,
ves_icall_RuntimeTypeHandle_GetModule_raw,
// token 730,
ves_icall_RuntimeTypeHandle_GetBaseType_raw,
// token 738,
ves_icall_RuntimeTypeHandle_type_is_assignable_from_raw,
// token 739,
ves_icall_RuntimeTypeHandle_IsGenericTypeDefinition,
// token 740,
ves_icall_RuntimeTypeHandle_GetGenericParameterInfo_raw,
// token 744,
ves_icall_RuntimeTypeHandle_is_subclass_of_raw,
// token 745,
ves_icall_RuntimeTypeHandle_IsByRefLike_raw,
// token 747,
ves_icall_System_RuntimeTypeHandle_internal_from_name_raw,
// token 749,
ves_icall_System_String_FastAllocateString_raw,
// token 941,
ves_icall_System_Type_internal_from_handle_raw,
// token 1089,
ves_icall_System_ValueType_InternalGetHashCode_raw,
// token 1090,
ves_icall_System_ValueType_Equals_raw,
// token 6471,
ves_icall_System_Threading_Interlocked_CompareExchange_Int,
// token 6472,
ves_icall_System_Threading_Interlocked_CompareExchange_Object,
// token 6474,
ves_icall_System_Threading_Interlocked_Decrement_Int,
// token 6475,
ves_icall_System_Threading_Interlocked_Increment_Int,
// token 6476,
ves_icall_System_Threading_Interlocked_Increment_Long,
// token 6477,
ves_icall_System_Threading_Interlocked_Exchange_Int,
// token 6478,
ves_icall_System_Threading_Interlocked_Exchange_Object,
// token 6480,
ves_icall_System_Threading_Interlocked_CompareExchange_Long,
// token 6482,
ves_icall_System_Threading_Interlocked_Exchange_Long,
// token 6484,
ves_icall_System_Threading_Interlocked_Add_Int,
// token 6494,
ves_icall_System_Threading_Monitor_Monitor_Enter_raw,
// token 6496,
mono_monitor_exit_icall_raw,
// token 6501,
ves_icall_System_Threading_Monitor_Monitor_pulse_raw,
// token 6503,
ves_icall_System_Threading_Monitor_Monitor_pulse_all_raw,
// token 6505,
ves_icall_System_Threading_Monitor_Monitor_wait_raw,
// token 6507,
ves_icall_System_Threading_Monitor_Monitor_try_enter_with_atomic_var_raw,
// token 6558,
ves_icall_System_Threading_Thread_InitInternal_raw,
// token 6559,
ves_icall_System_Threading_Thread_GetCurrentThread,
// token 6561,
ves_icall_System_Threading_InternalThread_Thread_free_internal_raw,
// token 6562,
ves_icall_System_Threading_Thread_GetState_raw,
// token 6563,
ves_icall_System_Threading_Thread_SetState_raw,
// token 6564,
ves_icall_System_Threading_Thread_ClrState_raw,
// token 6565,
ves_icall_System_Threading_Thread_SetName_icall_raw,
// token 6567,
ves_icall_System_Threading_Thread_YieldInternal,
// token 6569,
ves_icall_System_Threading_Thread_SetPriority_raw,
// token 7437,
ves_icall_System_Runtime_Loader_AssemblyLoadContext_PrepareForAssemblyLoadContextRelease_raw,
// token 7441,
ves_icall_System_Runtime_Loader_AssemblyLoadContext_GetLoadContextForAssembly_raw,
// token 7443,
ves_icall_System_Runtime_Loader_AssemblyLoadContext_InternalLoadFile_raw,
// token 7444,
ves_icall_System_Runtime_Loader_AssemblyLoadContext_InternalInitializeNativeALC_raw,
// token 7445,
ves_icall_System_Runtime_Loader_AssemblyLoadContext_InternalLoadFromStream_raw,
// token 7446,
ves_icall_System_Runtime_Loader_AssemblyLoadContext_InternalGetLoadedAssemblies_raw,
// token 7655,
ves_icall_System_GCHandle_InternalAlloc_raw,
// token 7656,
ves_icall_System_GCHandle_InternalFree_raw,
// token 7657,
ves_icall_System_GCHandle_InternalGet_raw,
// token 7658,
ves_icall_System_GCHandle_InternalSet_raw,
// token 7674,
ves_icall_System_Runtime_InteropServices_Marshal_GetLastPInvokeError,
// token 7675,
ves_icall_System_Runtime_InteropServices_Marshal_SetLastPInvokeError,
// token 7676,
ves_icall_System_Runtime_InteropServices_Marshal_StructureToPtr_raw,
// token 7678,
ves_icall_System_Runtime_InteropServices_Marshal_SizeOfHelper_raw,
// token 7718,
ves_icall_System_Runtime_InteropServices_NativeLibrary_LoadByName_raw,
// token 7785,
ves_icall_System_Runtime_CompilerServices_RuntimeHelpers_InternalGetHashCode_raw,
// token 7787,
ves_icall_System_Runtime_CompilerServices_RuntimeHelpers_InternalTryGetHashCode_raw,
// token 7796,
ves_icall_System_Runtime_CompilerServices_RuntimeHelpers_GetUninitializedObjectInternal_raw,
// token 7797,
ves_icall_System_Runtime_CompilerServices_RuntimeHelpers_InitializeArray_raw,
// token 7798,
ves_icall_System_Runtime_CompilerServices_RuntimeHelpers_GetSpanDataFrom_raw,
// token 7799,
ves_icall_System_Runtime_CompilerServices_RuntimeHelpers_SufficientExecutionStack,
// token 8179,
ves_icall_System_Reflection_Assembly_GetEntryAssembly_raw,
// token 8183,
ves_icall_System_Reflection_Assembly_InternalLoad_raw,
// token 8184,
ves_icall_System_Reflection_Assembly_InternalGetType_raw,
// token 8210,
ves_icall_System_Reflection_AssemblyName_GetNativeName,
// token 8227,
ves_icall_MonoCustomAttrs_GetCustomAttributesInternal_raw,
// token 8234,
ves_icall_MonoCustomAttrs_GetCustomAttributesDataInternal_raw,
// token 8241,
ves_icall_MonoCustomAttrs_IsDefinedInternal_raw,
// token 8252,
ves_icall_System_Reflection_FieldInfo_internal_from_handle_type_raw,
// token 8255,
ves_icall_System_Reflection_FieldInfo_get_marshal_info_raw,
// token 8275,
ves_icall_System_Reflection_LoaderAllocatorScout_Destroy,
// token 8346,
ves_icall_System_Reflection_RuntimeAssembly_GetManifestResourceNames_raw,
// token 8348,
ves_icall_System_Reflection_RuntimeAssembly_GetExportedTypes_raw,
// token 8357,
ves_icall_System_Reflection_RuntimeAssembly_GetInfo_raw,
// token 8359,
ves_icall_System_Reflection_RuntimeAssembly_GetManifestResourceInternal_raw,
// token 8360,
ves_icall_System_Reflection_Assembly_GetManifestModuleInternal_raw,
// token 8367,
ves_icall_System_Reflection_RuntimeCustomAttributeData_ResolveArgumentsInternal_raw,
// token 8381,
ves_icall_RuntimeEventInfo_get_event_info_raw,
// token 8401,
ves_icall_reflection_get_token_raw,
// token 8402,
ves_icall_System_Reflection_EventInfo_internal_from_handle_type_raw,
// token 8410,
ves_icall_RuntimeFieldInfo_ResolveType_raw,
// token 8412,
ves_icall_RuntimeFieldInfo_GetParentType_raw,
// token 8419,
ves_icall_RuntimeFieldInfo_GetFieldOffset_raw,
// token 8420,
ves_icall_RuntimeFieldInfo_GetValueInternal_raw,
// token 8423,
ves_icall_RuntimeFieldInfo_SetValueInternal_raw,
// token 8425,
ves_icall_RuntimeFieldInfo_GetRawConstantValue_raw,
// token 8430,
ves_icall_reflection_get_token_raw,
// token 8436,
ves_icall_get_method_info_raw,
// token 8437,
ves_icall_get_method_attributes,
// token 8444,
ves_icall_System_Reflection_MonoMethodInfo_get_parameter_info_raw,
// token 8446,
ves_icall_System_MonoMethodInfo_get_retval_marshal_raw,
// token 8458,
ves_icall_System_Reflection_RuntimeMethodInfo_GetMethodFromHandleInternalType_native_raw,
// token 8461,
ves_icall_RuntimeMethodInfo_get_name_raw,
// token 8462,
ves_icall_RuntimeMethodInfo_get_base_method_raw,
// token 8463,
ves_icall_reflection_get_token_raw,
// token 8474,
ves_icall_InternalInvoke_raw,
// token 8483,
ves_icall_RuntimeMethodInfo_GetPInvoke_raw,
// token 8489,
ves_icall_RuntimeMethodInfo_MakeGenericMethod_impl_raw,
// token 8490,
ves_icall_RuntimeMethodInfo_GetGenericArguments_raw,
// token 8491,
ves_icall_RuntimeMethodInfo_GetGenericMethodDefinition_raw,
// token 8493,
ves_icall_RuntimeMethodInfo_get_IsGenericMethodDefinition_raw,
// token 8494,
ves_icall_RuntimeMethodInfo_get_IsGenericMethod_raw,
// token 8511,
ves_icall_InvokeClassConstructor_raw,
// token 8513,
ves_icall_InternalInvoke_raw,
// token 8527,
ves_icall_reflection_get_token_raw,
// token 8544,
ves_icall_System_Reflection_RuntimeModule_ResolveMethodToken_raw,
// token 8571,
ves_icall_RuntimePropertyInfo_get_property_info_raw,
// token 8601,
ves_icall_reflection_get_token_raw,
// token 8602,
ves_icall_System_Reflection_RuntimePropertyInfo_internal_from_handle_type_raw,
// token 9025,
ves_icall_DynamicMethod_create_dynamic_method_raw,
// token 9108,
ves_icall_AssemblyBuilder_basic_init_raw,
// token 9109,
ves_icall_AssemblyBuilder_UpdateNativeCustomAttributes_raw,
// token 9253,
ves_icall_ModuleBuilder_basic_init_raw,
// token 9254,
ves_icall_ModuleBuilder_set_wrappers_type_raw,
// token 9258,
ves_icall_ModuleBuilder_getToken_raw,
// token 9261,
ves_icall_ModuleBuilder_RegisterToken_raw,
// token 9326,
ves_icall_TypeBuilder_create_runtime_class_raw,
// token 9681,
ves_icall_System_IO_Stream_HasOverriddenBeginEndRead_raw,
// token 9682,
ves_icall_System_IO_Stream_HasOverriddenBeginEndWrite_raw,
// token 9893,
ves_icall_System_Diagnostics_StackFrame_GetFrameInfo,
// token 9903,
ves_icall_System_Diagnostics_StackTrace_GetTrace,
// token 10543,
ves_icall_Mono_RuntimeClassHandle_GetTypeFromClass,
// token 10564,
ves_icall_Mono_RuntimeGPtrArrayHandle_GPtrArrayFree,
// token 10566,
ves_icall_Mono_SafeStringMarshal_StringToUtf8,
// token 10568,
ves_icall_Mono_SafeStringMarshal_GFree,
};
static uint8_t corlib_icall_flags [] = {
0,
0,
0,
0,
4,
4,
0,
4,
0,
4,
4,
0,
0,
0,
4,
4,
4,
4,
4,
0,
4,
0,
0,
0,
4,
4,
4,
4,
4,
0,
4,
4,
0,
0,
0,
0,
0,
0,
0,
0,
0,
0,
0,
0,
4,
4,
4,
4,
4,
4,
4,
4,
4,
4,
4,
4,
4,
4,
4,
0,
4,
4,
4,
4,
4,
4,
4,
0,
4,
4,
0,
0,
4,
4,
4,
4,
4,
4,
4,
4,
0,
4,
4,
4,
4,
4,
4,
4,
4,
0,
0,
0,
0,
0,
0,
0,
0,
0,
0,
4,
4,
4,
4,
4,
4,
4,
0,
4,
4,
4,
4,
4,
0,
4,
4,
4,
4,
4,
4,
4,
4,
4,
4,
4,
0,
0,
4,
4,
4,
4,
4,
4,
4,
4,
0,
4,
4,
4,
0,
4,
4,
4,
4,
4,
0,
4,
4,
4,
4,
4,
4,
4,
4,
4,
4,
4,
4,
4,
4,
4,
4,
4,
0,
4,
4,
4,
4,
4,
4,
4,
4,
4,
4,
4,
4,
4,
4,
4,
4,
4,
4,
4,
4,
4,
4,
4,
4,
4,
4,
4,
4,
4,
4,
0,
0,
0,
0,
0,
0,
};
